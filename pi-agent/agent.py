"""XEDO data uploader. Diagnostic channel is provided by run_agent.py."""
import argparse
import base64
import hashlib
import json
import os
import pathlib
import sqlite3
import subprocess
import time
import urllib.error
import urllib.request
import urllib.parse
import uuid
from datetime import datetime, timezone

def utc_now():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

class Spool:
    """Durable outbox; reject new records on overflow; retain rejected records."""
    def __init__(self, directory, limit=1000):
        self.root = pathlib.Path(directory)
        self.root.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.root / 'spool.sqlite')
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY, endpoint TEXT, payload TEXT, attempts INTEGER DEFAULT 0, next_at REAL DEFAULT 0, state TEXT DEFAULT "queued")')
        self.db.execute('CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT)')
        self.limit = limit

    def enqueue(self, event_id, endpoint, payload):
        encoded = json.dumps(payload)
        existing = self.db.execute('SELECT endpoint,payload FROM outbox WHERE id=?', (event_id,)).fetchone()
        if existing:
            canonical = lambda value: json.dumps(value, sort_keys=True, separators=(',', ':'))
            if existing[0] != endpoint or canonical(json.loads(existing[1])) != canonical(json.loads(encoded)):
                raise ValueError('ID_CONFLICT: queued ID already has a different endpoint or payload')
            return event_id
        if self.db.execute('SELECT COUNT(*) FROM outbox').fetchone()[0] >= self.limit or self.db.execute('SELECT COALESCE(SUM(length(payload)),0) FROM outbox').fetchone()[0] + len(json.dumps(payload)) > 64 * 1024 * 1024:
            raise OverflowError('spool_overflow: reject new; queued/rejected data retained')
        self.db.execute('INSERT INTO outbox(id,endpoint,payload) VALUES(?,?,?)', (event_id, endpoint, encoded))
        self.db.commit()
        return event_id

    def identity(self):
        """Boot identity from Linux boot_id, fresh process fallback; sequence durable."""
        try:
            boot = pathlib.Path('/proc/sys/kernel/random/boot_id').read_text().strip()
        except OSError:
            old = self.db.execute('SELECT value FROM meta WHERE key="boot"').fetchone()
            boot = old[0] if old else str(uuid.uuid4())
        self.db.execute('INSERT OR REPLACE INTO meta(key,value) VALUES("boot",?)', (boot,))
        key = 'sequence:' + boot
        old = self.db.execute('SELECT value FROM meta WHERE key=?', (key,)).fetchone()
        sequence = int(old[0]) + 1 if old else 0
        self.db.execute('INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)', (key, str(sequence)))
        self.db.commit()
        return 'BOOT_' + boot.replace('-', ''), sequence

    def send(self, sender, maximum=20, clock=time.time):
        sent = 0
        for key, endpoint, payload, attempts in self.db.execute('SELECT id,endpoint,payload,attempts FROM outbox WHERE state="queued" AND next_at<=? ORDER BY rowid LIMIT ?', (clock(), maximum)).fetchall():
            try:
                sender(endpoint, json.loads(payload))
            except urllib.error.HTTPError as error:
                if 400 <= error.code < 500 and error.code not in (408, 429):
                    self.db.execute('UPDATE outbox SET state="rejected",attempts=attempts+1 WHERE id=?', (key,))
                else:
                    self.db.execute('UPDATE outbox SET attempts=attempts+1,next_at=? WHERE id=?', (clock() + min(60, 2 ** min(attempts + 1, 6)), key))
            except (urllib.error.URLError, TimeoutError, ConnectionError):
                self.db.execute('UPDATE outbox SET attempts=attempts+1,next_at=? WHERE id=?', (clock() + min(60, 2 ** min(attempts + 1, 6)), key))
            else:
                self.db.execute('DELETE FROM outbox WHERE id=?', (key,))
                sent += 1
            self.db.commit()
        return sent

    def status(self):
        return dict(self.db.execute('SELECT state,COUNT(*) FROM outbox GROUP BY state').fetchall())

def read_status(file_path):
    """Optional JSON from the team's driver; unknown values stay None."""
    if not file_path:
        return {'position': None, 'battery': None, 'dispenser': None, 'health': {'agent': 'online', 'fault_code': None}}
    with open(file_path, encoding='utf-8') as source:
        data = json.load(source)
    return {k: data.get(k) for k in ('position', 'battery', 'dispenser', 'health')} | {'health': data.get('health') or {'agent': 'online', 'fault_code': None}}

def packet(spool, device, mission, mode, status, clock_quality='unknown'):
    boot, sequence = spool.identity()
    return {'schema_version': '1.0', 'event_id': 'EVT_' + uuid.uuid4().hex, 'device_id': device, 'boot_id': boot, 'sequence': sequence, 'observed_at': utc_now(), 'clock_quality': clock_quality, 'mission_id': mission, 'source_mode': mode, **status}

def request_sender(base_url, device_token, site_token):
    parsed = urllib.parse.urlsplit(base_url)
    local = parsed.hostname in ('127.0.0.1', 'localhost', '::1')
    if not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('', '/') or not (parsed.scheme == 'https' or parsed.scheme == 'http' and local):
        raise ValueError('Use localhost for testing or an authenticated HTTPS endpoint')
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            raise urllib.error.HTTPError(req.full_url, code, 'Redirect blocked; check Site access and configured URL', headers, fp)
    handlers = [NoRedirect()]
    if local:
        handlers.append(urllib.request.ProxyHandler({}))
    opener = urllib.request.build_opener(*handlers)
    def send(endpoint, payload=None, method='POST'):
        if not endpoint.startswith('/api/v1/') or endpoint.startswith('//') or '\\' in endpoint or urllib.parse.urlsplit(endpoint).netloc:
            raise ValueError('Use an XEDO API endpoint')
        headers = {}
        if device_token:
            headers['X-XEDO-Device-Token'] = device_token
        if site_token:
            headers['OAI-Sites-Authorization'] = 'Bearer ' + site_token
        if method == 'GET':
            data = None
        elif endpoint == '/api/v1/captures':
            boundary = 'XEDO' + uuid.uuid4().hex
            file_bytes = base64.b64decode(payload['file_base64'])
            if hashlib.sha256(file_bytes).hexdigest() != payload['checksum']:
                raise ValueError('spooled image checksum mismatch')
            metadata = json.dumps(payload['metadata']).encode()
            data = b'--' + boundary.encode() + b'\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n' + metadata + b'\r\n--' + boundary.encode() + b'\r\nContent-Disposition: form-data; name="file"; filename="capture.' + payload['extension'].encode() + b'"\r\nContent-Type: ' + payload['mime'].encode() + b'\r\n\r\n' + file_bytes + b'\r\n--' + boundary.encode() + b'--\r\n'
            headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary
        else:
            data = json.dumps(payload).encode()
            headers['Content-Type'] = 'application/json'
        request = urllib.request.Request(base_url.rstrip('/') + endpoint, data=data, headers=headers, method=method)
        with opener.open(request, timeout=10) as response:
            if 'application/json' not in response.headers.get('Content-Type', ''):
                raise urllib.error.URLError('Expected API JSON; check Site access, not a sign-in page')
            try:
                value = json.load(response)
            except (ValueError, UnicodeError) as error:
                raise urllib.error.URLError('Invalid API JSON') from error
            if not isinstance(value, dict):
                raise urllib.error.URLError('Expected an API JSON object')
            return value
    return send

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--spool', default='spool')
    parser.add_argument('--device', default='pi-001')
    parser.add_argument('--mode', choices=['live', 'replay'], default='live')
    parser.add_argument('--mission')
    parser.add_argument('--url', default=os.environ.get('XEDO_API_URL', 'http://127.0.0.1:5173'))
    sub = parser.add_subparsers(dest='command', required=True)
    heartbeat = sub.add_parser('heartbeat')
    heartbeat.add_argument('--status-json')
    heartbeat.add_argument('--clock-quality', choices=['synced', 'unsynced', 'unknown'], default='unknown')
    heartbeat.add_argument('--count', type=int, default=1)
    sub.add_parser('flush')
    sub.add_parser('status')
    image = sub.add_parser('image')
    image.add_argument('file')
    image.add_argument('metadata', help='capture metadata JSON; use imported for existing files')
    result = sub.add_parser('result')
    result.add_argument('file', help='processing result JSON from an existing adapter')
    camera = sub.add_parser('capture')
    camera.add_argument('output')
    camera.add_argument('metadata', help='metadata with incident/device/mode and capture_id')
    args = parser.parse_args()
    spool = Spool(args.spool)
    sender = request_sender(args.url, os.environ.get('XEDO_PI_TOKEN'), os.environ.get('XEDO_SITE_ACCESS_TOKEN'))
    if args.command == 'heartbeat':
        for index in range(max(1, args.count)):
            event = packet(spool, args.device, args.mission, args.mode, read_status(args.status_json), args.clock_quality)
            spool.enqueue(event['event_id'], '/api/v1/telemetry/batches', {'device_id': args.device, 'source_mode': args.mode, 'events': [event]})
            spool.send(sender)
            if index + 1 < args.count:
                time.sleep(1)
    elif args.command in ('image', 'capture'):
        with open(args.metadata, encoding='utf-8') as source:
            metadata = json.load(source)
        image_path = pathlib.Path(args.file if args.command == 'image' else args.output)
        if args.command == 'capture':
            subprocess.run(['rpicam-jpeg', '--nopreview', '--timeout', '2000', '--output', str(image_path)], check=True, timeout=15)
            metadata.update({'capture_mode': 'captured_live', 'captured_at': utc_now()})
        elif metadata.get('capture_mode') != 'imported':
            raise ValueError('existing files must use capture_mode imported')
        bytes_value = image_path.read_bytes()
        if not 0 < len(bytes_value) <= 8 * 1024 * 1024:
            raise ValueError('image must be 1 byte–8 MiB')
        extension = image_path.suffix.lower().strip('.')
        mime = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}[extension]
        spool.enqueue(metadata['capture_id'], '/api/v1/captures', {'metadata': metadata, 'file_base64': base64.b64encode(bytes_value).decode(), 'checksum': hashlib.sha256(bytes_value).hexdigest(), 'extension': extension, 'mime': mime})
        spool.send(sender)
    elif args.command == 'result':
        with open(args.file, encoding='utf-8') as source:
            result = json.load(source)
        spool.enqueue(result['run_id'], '/api/v1/image-processing-results', result)
        spool.send(sender)
    elif args.command == 'flush':
        spool.send(sender)
    print(json.dumps({'spool': spool.status(), 'hardware_control': False}))

if __name__ == '__main__':
    main()
