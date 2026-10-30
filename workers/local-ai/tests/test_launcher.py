from contextlib import redirect_stdout, nullcontext
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import launch_worker as launcher
import worker_guard as guard

TEST_ROOT = HERE.parents[1] / 'output/local-ai-launcher-tests'
TEST_ROOT.mkdir(exist_ok=True)


def config(root, **changes):
    values = dict(session_file=root / 'session.dpapi', work_root=root / 'work',
                  python=sys.executable, pipeline=root / 'pipeline.py', model=None,
                  env_file=None, base_url=launcher.remote.PRODUCTION_URL)
    values.update(changes)
    return SimpleNamespace(**values)


class FakeProcess:
    pid = 987654
    info = {'name': 'python.exe'}
    def __init__(self, args, cwd):
        self.args, self.directory = args, str(cwd)
    def exe(self): return sys.executable
    def cmdline(self): return self.args
    def cwd(self): return self.directory


class LauncherTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=TEST_ROOT)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.config = config(self.root)

    def write_config(self, root, **updates):
        value = {'sessionFile': str(self.config.session_file), 'workRoot': str(self.config.work_root)}
        value.update(updates)
        root.mkdir(exist_ok=True, parents=True)
        path = root / 'worker config.json'
        path.write_text(json.dumps(value))
        return path

    def test_legacy_worker_with_spaces_and_relative_config_is_detected(self):
        directory = self.root / 'folder with spaces & symbols'
        path = self.write_config(directory)
        process = FakeProcess([sys.executable, str(HERE / 'remote_worker.py'), 'run',
                               '--config', path.name], directory)
        self.assertEqual(guard.matching_worker(self.config, [process]), process.pid)

    def test_same_session_or_checkpoint_is_exclusive_even_with_other_config(self):
        path = self.write_config(self.root / 'alternate', workRoot=str(self.root / 'other-work'))
        self.assertTrue(guard.config_conflicts(path, self.config))
        path = self.write_config(self.root / 'alternate', sessionFile=str(self.root / 'other.dpapi'))
        self.assertTrue(guard.config_conflicts(path, self.config))

    def test_other_worker_root_is_not_blocked_or_terminated(self):
        path = self.write_config(self.root / 'other', sessionFile=str(self.root / 'other.dpapi'),
                                 workRoot=str(self.root / 'other-work'))
        process = FakeProcess([sys.executable, str(HERE / 'remote_worker.py'), 'run',
                               '--config=' + str(path)], self.root)
        self.assertIsNone(guard.matching_worker(self.config, [process]))

    def test_competing_new_launcher_is_left_to_the_atomic_locks(self):
        process = FakeProcess([sys.executable, str(HERE / 'launch_worker.py')], self.root)
        self.assertIsNone(guard.matching_worker(self.config, [process]))

    def test_identified_legacy_config_that_cannot_be_checked_fails_closed(self):
        process = FakeProcess([sys.executable, str(HERE / 'remote_worker.py'), 'run',
                               '--config', 'missing.json'], self.root)
        with self.assertRaises(guard.GuardError) as caught:
            guard.matching_worker(self.config, [process])
        self.assertEqual(caught.exception.code, 'WORKER_CHECK_UNAVAILABLE')

    def test_check_only_does_not_read_session_or_call_auth(self):
        with patch.object(launcher, 'preflight', return_value=self.config), \
             patch.object(launcher.remote, 'SessionStore') as store, \
             patch.object(launcher.remote, 'RpcClient') as client, \
             redirect_stdout(io.StringIO()):
            self.assertEqual(launcher.main(['--check-only']), 0)
            store.assert_not_called(); client.assert_not_called()

    def test_duplicate_start_does_not_touch_session_or_overwrite_ready_status(self):
        status = self.config.work_root.parent / 'launcher-status.json'
        status.write_text('{"state":"READY"}')
        with patch.object(launcher, 'preflight', return_value=self.config), \
             patch.object(launcher, 'WorkerGuard', side_effect=guard.GuardError('WORKER_ALREADY_RUNNING')), \
             patch.object(launcher.remote, 'RpcClient') as client, redirect_stdout(io.StringIO()):
            self.assertEqual(launcher.main([]), 0)
            client.assert_not_called()
        self.assertEqual(status.read_text(), '{"state":"READY"}')

    def test_provider_secret_in_error_is_not_printed_or_saved(self):
        output = io.StringIO()
        error = launcher.remote.WorkerError('NETWORK_UNAVAILABLE', 'secret-marker-refresh-token', retryable=True)
        with patch.object(launcher, 'preflight', return_value=self.config), \
             patch.object(launcher, 'WorkerGuard', return_value=nullcontext()), \
             patch.object(launcher.remote, 'RpcClient', side_effect=error), \
             patch.object(launcher.remote, 'SessionStore'), redirect_stdout(output):
            self.assertEqual(launcher.main([]), 2)
        self.assertNotIn('secret-marker', output.getvalue())
        saved = (self.root / 'launcher-status.json').read_text()
        self.assertNotIn('secret-marker', saved)
        self.assertEqual(json.loads(saved)['state'], 'STOPPED')

    def test_starting_job_immediately_replaces_idle_ready_state(self):
        console = launcher.Console(self.config)
        with redirect_stdout(io.StringIO()):
            console.event({'event': 'waiting'})
            console.event({'event': 'processing'})
        state = json.loads((self.root / 'launcher-status.json').read_text())
        self.assertEqual(state['state'], 'WORKING')

    @unittest.skipUnless(os.name == 'nt', 'Windows CLI qualification')
    def test_direct_cli_guard_allows_its_own_python_bootstrap_process(self):
        # Missing session must stop before any network request; reaching that
        # error proves the guard did not mistake its own Python parent for a
        # second worker.
        path = self.root / 'config.json'
        path.write_text(json.dumps({'publishableKey': 'sb_publishable_fixture',
            'sessionFile': str(self.root / 'missing.dpapi'), 'workRoot': str(self.root / 'work')}))
        result = subprocess.run([sys.executable, '-B', str(HERE / 'remote_worker.py'), 'status',
                                 '--config', str(path)], capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 2)
        self.assertIn('MACHINE_SIGN_IN_REQUIRED', result.stdout)

    @unittest.skipUnless(os.name == 'nt', 'Windows byte-lock qualification')
    def test_windows_process_lock_is_released_after_crash_and_stale_file_is_safe(self):
        # A separate process holds both locks. Parent may not use either the
        # same session OR checkpoint until the process exits, even abnormally.
        payload = json.dumps({'session': str(self.config.session_file), 'work': str(self.config.work_root)})
        script = """import json,pathlib,sys,time
from types import SimpleNamespace
sys.path.insert(0,sys.argv[1]);from worker_guard import WorkerGuard
v=json.loads(sys.argv[2]);c=SimpleNamespace(session_file=pathlib.Path(v['session']),work_root=pathlib.Path(v['work']))
with WorkerGuard(c,legacy_scan=False):
 pathlib.Path(sys.argv[3]).write_text('locked')
 time.sleep(30)
"""
        marker = self.root / 'acquired'
        child = subprocess.Popen([sys.executable, '-B', '-c', script, str(HERE), payload, str(marker)],
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            deadline = time.monotonic() + 10
            while not marker.exists() and time.monotonic() < deadline and child.poll() is None:
                time.sleep(.02)
            self.assertTrue(marker.exists(), 'child did not acquire lock')
            with self.assertRaises(guard.GuardError):
                with guard.WorkerGuard(config(self.root, work_root=self.root / 'other'), legacy_scan=False): pass
            with self.assertRaises(guard.GuardError):
                with guard.WorkerGuard(config(self.root, session_file=self.root / 'other.dpapi'), legacy_scan=False): pass
        finally:
            child.terminate(); child.wait(timeout=5)
        with guard.WorkerGuard(self.config, legacy_scan=False):
            self.assertTrue((self.config.work_root / '.worker.lock').is_file())


if __name__ == '__main__':
    unittest.main(verbosity=2)
