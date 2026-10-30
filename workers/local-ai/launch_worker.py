"""Interactive Windows launcher. No installs, paid services or public listener."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import getpass
import importlib.util
import json
from pathlib import Path
import sys

import remote_worker as remote
from worker_guard import GuardError, WorkerGuard

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = ROOT / 'local-data/local-ai-worker/worker.config.json'
STAGES = {'searching': 'Searching satellite imagery', 'downloading': 'Downloading SAR imagery',
          'validating_input': 'Checking imagery', 'loading_model': 'Loading CPU model',
          'inferencing': 'Analyzing on this CPU', 'packaging': 'Preparing risk areas',
          'publishing': 'Saving the result'}
AUTH_CODES = {'MACHINE_SIGN_IN_REQUIRED', 'SESSION_INVALID', 'DPAPI_FAILED',
              'AUTH_RESPONSE_INVALID', 'MACHINE_DISABLED', 'MACHINE_NOT_REGISTERED'}


def preflight(path):
    if not Path(path).is_file():
        raise remote.WorkerError('CONFIG_MISSING', 'The prepared worker configuration is missing.')
    config = remote.load_config(path)
    required = [Path(config.python), config.pipeline]
    if config.model:
        required.append(Path(config.model))
    if config.env_file:
        required.append(Path(config.env_file))
    if any(not p.is_file() for p in required):
        raise remote.WorkerError('LOCAL_FILE_MISSING', 'Keep the prepared environment, model and configuration in place.')
    if any(importlib.util.find_spec(name) is None
           for name in ('requests', 'psutil', 'ee', 'rasterio', 'torch', 'shapely')):
        raise remote.WorkerError('ENVIRONMENT_MISSING', 'The prepared CPU environment is incomplete.')
    return config


class Console:
    def __init__(self, config):
        self.path = config.work_root.parent / 'launcher-status.json'
        self.last = None

    def show(self, state, text, **details):
        # Only selected values reach either the console or the local status file.
        safe = {'state': state, 'at': datetime.now(timezone.utc).isoformat(), **details}
        remote.save_json(self.path, safe)
        if (state, text) != self.last:
            print(f'[{state}] {text}', flush=True)
            self.last = (state, text)

    def event(self, event):
        name = event.get('event')
        if name == 'waiting':
            self.show('READY', 'Waiting for Analyze from https://xedo-eight.vercel.app/')
        elif name == 'processing':
            self.show('WORKING', 'Starting the current analysis on this CPU...')
        elif name == 'progress':
            stage = event.get('stage')
            text = STAGES.get(stage, 'Processing the current analysis')
            count, total = event.get('processedTiles'), event.get('totalTiles')
            if isinstance(count, int) and isinstance(total, int) and total > 0:
                text += f' ({count}/{total} tiles)'
            self.show('WORKING', text)
        elif name == 'published':
            self.show('SAVED', 'Analysis completed and saved. You can review it on the website.')
        elif name in ('connection_wait', 'publication_pending'):
            self.show('RECONNECTING', 'Connection interrupted. Retrying; keep the computer online.')
        elif name == 'attempt_failed':
            self.show('JOB_STOPPED', 'This analysis stopped. Check the job message on the website.')


def connect_machine(client):
    print('Use the CPU account already created by the team, not the Inspector account.', flush=True)
    email = input('CPU account email: ').strip()
    password = getpass.getpass('CPU account password (hidden): ')
    try:
        client.login(email, password)
    finally:
        password = None


def main(argv=None):
    parser = argparse.ArgumentParser(description='Start the prepared XEDO local CPU worker.')
    parser.add_argument('--config', type=Path, default=DEFAULT_CONFIG)
    parser.add_argument('--check-only', action='store_true', help='Offline file/dependency check; no session reads or requests.')
    parser.add_argument('--reconnect', action='store_true', help='Sign in with the existing CPU account using hidden password input.')
    parser.add_argument('--once', action='store_true', help='One normal worker cycle, for an authorized startup check.')
    args = parser.parse_args(argv)
    console = None
    try:
        config = preflight(args.config)
        if args.check_only:
            print('[CHECKED] Local files and CPU dependencies are present. No connection or analysis was started.')
            return 0
        with WorkerGuard(config):
            console = Console(config)
            console.show('CONNECTING', 'Connecting the CPU worker. Please wait...')
            client = remote.RpcClient(config, remote.SessionStore(config.session_file, config.base_url),
                                      load_session=not args.reconnect)
            if args.reconnect or not client.session:
                if not sys.stdin.isatty():
                    raise remote.WorkerError('MACHINE_SIGN_IN_REQUIRED', 'Connect the existing CPU account from an interactive window.')
                connect_machine(client)
            # The guard is held before any session refresh or presence request.
            client.rpc('presence', {})
            console.show('CONNECTING', 'CPU connected. Checking saved work and the queue...')
            print('Keep the computer awake and online. Wait for SAVED / READY before Ctrl+C or shutdown.', flush=True)
            remote.Worker(config, client, emit=console.event).loop(args.once)
            console.show('STOPPED', 'The startup check finished; this window is not receiving new jobs.')
            return 0
    except GuardError as error:
        if error.code == 'WORKER_ALREADY_RUNNING':
            print('[ALREADY OPEN] A CPU worker or CPU account operation is already running. No second worker was started.')
            print('Check the existing worker window and Local processor status on the website.')
            return 0
        print('[STOPPED] Could not safely check the existing worker. No second worker was started.')
        return 2
    except KeyboardInterrupt:
        if console:
            console.show('STOPPED', 'CPU worker stopped. Open Start-XEDO-CPU.cmd to start it again.')
        return 130
    except remote.WorkerError as error:
        auth = error.code in AUTH_CODES or error.status in (401, 403)
        text = ('CPU connection needs attention. See the reconnect steps in docs/CPU_WORKER_START_GUIDE.md.'
                if auth else 'Check internet and the prepared local files, then open this launcher again.')
        if console:
            console.show('STOPPED', text, code=error.code)
        else:
            print(f'[STOPPED] {text} Code: {error.code}', flush=True)
        if auth:
            print('Sign in to the website separately with your Inspector account. Do not send passwords in chat.')
        return 2
    except Exception:
        # Provider, filesystem and library errors may contain credential data.
        if console:
            console.show('STOPPED', 'Could not start the worker. See docs/CPU_WORKER_START_GUIDE.md.', code='LAUNCHER_UNAVAILABLE')
        else:
            print('[STOPPED] Could not start the worker. See docs/CPU_WORKER_START_GUIDE.md.')
        return 2


if __name__ == '__main__':
    sys.exit(main())
