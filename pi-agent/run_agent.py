"""Persistent Raspberry Pi telemetry uploader. No hardware control."""
import argparse
import json
import logging
import os
import pathlib
import re
import shlex
import signal
import sys
import threading
import time
import urllib.error
from agent import Spool, packet, read_status, request_sender

LOG = logging.getLogger('xedo-pi')

def load_config(filename):
    for number, line in enumerate(pathlib.Path(filename).read_text(encoding='utf-8').splitlines(), 1):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        key, separator, value = line.partition('=')
        if not separator or not re.fullmatch(r'XEDO_[A-Z0-9_]+', key.strip()):
            raise ValueError(f'Invalid config key on line {number}')
        words = shlex.split(value, comments=True)
        if len(words) > 1:
            raise ValueError(f'Quote values with spaces on line {number}')
        os.environ[key.strip()] = words[0] if words else ''

def status_snapshot(filename, max_age=10, clock=time.time):
    if not filename:
        return read_status(None)
    fault = 'status_file_unavailable'
    try:
        if clock() - pathlib.Path(filename).stat().st_mtime > max_age:
            fault = 'status_file_stale'
            raise ValueError('stale sensor data')
        value = read_status(filename)
        if not isinstance(value.get('health'), dict):
            raise ValueError('invalid health')
        value['health'] = {**value['health'], 'agent': 'online'}
        return value
    except (OSError, ValueError, TypeError, AttributeError):
        return {'position': None, 'battery': None, 'dispenser': None,
                'health': {'agent': 'online', 'fault_code': fault}}

def doctor(sender, device):
    health = sender('/api/v1/health', method='GET')
    auth = sender(f'/api/v1/devices/{device}/auth-check', method='GET')
    if health.get('status') != 'ok' or not health.get('piConfigured') or auth.get('device_authenticated') is not True or auth.get('device_id') != device:
        raise ValueError('Backend is not ready')
    return {'api_reachable': True, 'device_authenticated': True, 'device_id': device, 'hardware_tested': False}

def cycle(spool, sender, device, mission=None, status_file=None, clock_quality='unknown', max_age=10):
    spool.send(sender)
    try:
        event = packet(spool, device, mission, 'live', status_snapshot(status_file, max_age), clock_quality)
        spool.enqueue(event['event_id'], '/api/v1/telemetry/batches',
                      {'device_id': device, 'source_mode': 'live', 'events': [event]})
    except OverflowError:
        LOG.error('spool_overflow: retained saved data; skipped new heartbeat')
    spool.send(sender)
    LOG.info('telemetry_cycle spool=%s hardware_control=false', json.dumps(spool.status()))

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', help='KEY=value configuration file')
    parser.add_argument('command', choices=['run', 'doctor'])
    parser.add_argument('--count', type=int, default=0, help='cycles; zero runs until stopped')
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
    if args.config:
        load_config(args.config)
    device = os.environ.get('XEDO_PI_DEVICE_ID', 'pi-001')
    token = os.environ.get('XEDO_PI_TOKEN', '')
    if not re.fullmatch(r'[a-zA-Z0-9_-]{5,90}', device) or len(token) < 32 or token == 'REPLACE_WITH_GENERATED_TOKEN':
        raise ValueError('Set a valid device ID and generated device token')
    sender = request_sender(os.environ.get('XEDO_API_URL', 'http://127.0.0.1:5173'), token,
                            os.environ.get('XEDO_SITE_ACCESS_TOKEN'))
    if args.command == 'doctor':
        print(json.dumps(doctor(sender, device)))
        return
    interval = float(os.environ.get('XEDO_PI_INTERVAL_S', '2'))
    max_age = float(os.environ.get('XEDO_PI_STATUS_MAX_AGE_S', '10'))
    clock_quality = os.environ.get('XEDO_PI_CLOCK_QUALITY', 'unknown')
    if not 1 <= interval <= 60 or not 1 <= max_age <= 600 or clock_quality not in ('unknown', 'synced', 'unsynced') or args.count < 0:
        raise ValueError('Invalid timing configuration')
    spool = Spool(os.environ.get('XEDO_PI_SPOOL', 'spool'))
    lock = None
    if os.name == 'posix':
        import fcntl
        lock = (spool.root / 'agent.lock').open('w')
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            lock.close()
            spool.db.close()
            raise ValueError('Another agent is using this spool')
    stop = threading.Event()
    for signum in (signal.SIGINT, signal.SIGTERM):
        signal.signal(signum, lambda *_: stop.set())
    index = 0
    try:
        while not stop.is_set() and (args.count == 0 or index < args.count):
            started = time.monotonic()
            cycle(spool, sender, device, os.environ.get('XEDO_PI_MISSION') or None,
                  os.environ.get('XEDO_PI_STATUS_JSON') or None, clock_quality, max_age)
            index += 1
            if args.count == 0 or index < args.count:
                stop.wait(max(0, interval - (time.monotonic() - started)))
    finally:
        spool.db.close()
        if lock:
            lock.close()

if __name__ == '__main__':
    try:
        main()
    except urllib.error.HTTPError as error:
        print(f'Connection failed: HTTP {error.code}. Check device credentials and private Site access.', file=sys.stderr)
        sys.exit(1)
    except (ValueError, OSError) as error:
        print(f'Pi uploader failed ({type(error).__name__}). Check configuration, network and storage; run doctor again.', file=sys.stderr)
        sys.exit(1)
