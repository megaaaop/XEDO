"""Exclusive access to one protected machine session and worker checkpoint.

Lock files contain one marker byte, not account/session data. Windows releases
the actual byte locks if the process exits or the computer shuts down.
"""
from __future__ import annotations
from contextlib import ExitStack
import json
import os
from pathlib import Path
import sys


class GuardError(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


def normalized(path, base=None):
    path = Path(path)
    if base is not None and not path.is_absolute():
        path = Path(base) / path
    return os.path.normcase(str(path.resolve()))


def config_conflicts(config_path, config):
    """Read only two nonsecret path fields from an identified XEDO config."""
    path = Path(config_path)
    try:
        if path.stat().st_size > 16384:
            raise ValueError()
        value = json.loads(path.read_text(encoding='utf-8-sig'))
        if not isinstance(value, dict):
            raise ValueError()
        return (normalized(value.get('sessionFile', 'machine-session.dpapi'), path.parent)
                == normalized(config.session_file)
                or normalized(value.get('workRoot', 'work'), path.parent)
                == normalized(config.work_root))
    except (OSError, ValueError, TypeError):
        # An identified XEDO process whose config cannot be checked is unsafe
        # to run alongside. Never assume its checkpoint/session is different.
        raise GuardError('WORKER_CHECK_UNAVAILABLE') from None


def matching_worker(config, processes=None):
    """Find older, unguarded workers without touching their RPC/session files."""
    import psutil
    here = Path(__file__).resolve().parent
    # New launchers all take these locks before doing anything. Do not mistake
    # a second launcher that is about to exit for an old, unguarded worker.
    scripts = {normalized(here / 'remote_worker.py'): 'remote_worker.py'}
    executables = {normalized(p) for p in
                   (sys.executable, getattr(sys, '_base_executable', sys.executable), config.python)}
    processes = psutil.process_iter(['pid', 'name']) if processes is None else processes
    for process in processes:
        if process.pid == os.getpid() or 'python' not in (process.info.get('name') or '').lower():
            continue
        try:
            if normalized(process.exe()) not in executables:
                continue
            args = process.cmdline()
            # Windows venv python.exe may keep a redirector parent alive with
            # the exact same invocation. It is this worker, not another one.
            original = getattr(sys, 'orig_argv', None)
            if process.pid == os.getppid() and original and args[1:] == original[1:]:
                continue
            cwd = process.cwd()
            found = next(((i, scripts[normalized(arg, cwd)]) for i, arg in enumerate(args)
                          if Path(arg).name.lower() in ('remote_worker.py', 'launch_worker.py')
                          and normalized(arg, cwd) in scripts), None)
            if not found:
                continue
            index, name = found
            tail = args[index + 1:]
            # Any old direct CLI operation can refresh/replace the same session.
            config_arg = next((tail[i + 1] for i, arg in enumerate(tail[:-1])
                               if arg == '--config'), None)
            if config_arg is None:
                config_arg = next((arg.split('=', 1)[1] for arg in tail
                                   if arg.startswith('--config=')), None)
            if config_arg is None:
                raise GuardError('WORKER_CHECK_UNAVAILABLE')
            if config_conflicts(Path(normalized(config_arg, cwd)), config):
                return process.pid
        except psutil.NoSuchProcess:
            continue
        except psutil.AccessDenied:
            # Fail closed if a candidate Python process cannot be inspected.
            raise GuardError('WORKER_CHECK_UNAVAILABLE') from None
    return None


class WorkerGuard:
    def __init__(self, config, *, legacy_scan=True):
        self.config, self.legacy_scan, self.stack = config, legacy_scan, None

    def __enter__(self):
        if os.name != 'nt':
            raise GuardError('WINDOWS_REQUIRED')
        import msvcrt
        stack = ExitStack()
        try:
            paths = {self.config.session_file.with_suffix(self.config.session_file.suffix + '.worker.lock'),
                     self.config.work_root / '.worker.lock'}
            for path in sorted(paths, key=normalized):
                path.parent.mkdir(parents=True, exist_ok=True)
                handle = stack.enter_context(path.open('a+b'))
                if not path.stat().st_size:
                    handle.write(b'0'); handle.flush()
                handle.seek(0)
                try:
                    msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
                except OSError:
                    raise GuardError('WORKER_ALREADY_RUNNING') from None
                stack.callback(self._unlock, handle)
            if self.legacy_scan and matching_worker(self.config) is not None:
                raise GuardError('WORKER_ALREADY_RUNNING')
            self.stack = stack
            return self
        except BaseException:
            stack.close()
            raise

    @staticmethod
    def _unlock(handle):
        import msvcrt
        handle.seek(0)
        msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)

    def __exit__(self, *exc):
        self.stack.close()
