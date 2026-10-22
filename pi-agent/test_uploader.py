import json
import os
import pathlib
import tempfile
import unittest
import urllib.error
from unittest.mock import patch
from agent import Spool, request_sender
from run_agent import status_snapshot, cycle, doctor, load_config

class UploaderTest(unittest.TestCase):
    def test_outage_retains_event_identity_then_flushes(self):
        with tempfile.TemporaryDirectory() as directory:
            spool = Spool(directory)
            def offline(*args, **kwargs):
                raise urllib.error.URLError('offline')
            cycle(spool, offline, 'pi-001')
            original = json.loads(spool.db.execute('SELECT payload FROM outbox').fetchone()[0])['events'][0]['event_id']
            spool.db.execute('UPDATE outbox SET next_at=0'); spool.db.commit()
            delivered = []
            cycle(spool, lambda endpoint, payload: delivered.extend(payload['events']), 'pi-001')
            self.assertEqual(delivered[0]['event_id'], original)
            self.assertEqual(len(delivered), 2)
            self.assertIsNone(delivered[1]['position'])
            self.assertEqual(spool.status(), {})
            spool.db.close()

    def test_sensor_failure_and_stale_file_withhold_measurements(self):
        with tempfile.TemporaryDirectory() as directory:
            file = pathlib.Path(directory) / 'status.json'
            self.assertIsNone(status_snapshot(file)['battery'])
            file.write_text('{invalid', encoding='utf-8')
            self.assertIsNone(status_snapshot(file)['position'])
            file.write_text(json.dumps({'battery': {'percent': 45}, 'health': {'agent': 'online'}}), encoding='utf-8')
            self.assertEqual(status_snapshot(file)['battery']['percent'], 45)
            old = file.stat().st_mtime
            stale = status_snapshot(file, clock=lambda: old + 11)
            self.assertIsNone(stale['battery'])
            self.assertEqual(stale['health']['fault_code'], 'status_file_stale')

    def test_transport_limits_origin_and_blocks_redirects(self):
        for url in ['http://remote.example', 'https://user:password@example.com', 'https://example.com?token=secret']:
            with self.assertRaises(ValueError): request_sender(url, 'fixture', None)
        with patch('urllib.request.build_opener') as factory:
            request_sender('https://example.com', 'fixture', None)
            handler = factory.call_args.args[0]
            with self.assertRaises(urllib.error.HTTPError):
                handler.redirect_request(type('Req', (), {'full_url': 'https://example.com/api'})(), None, 302, '', {}, 'https://other.example')

    def test_doctor_checks_auth_without_posting_data(self):
        calls = []
        def sender(endpoint, payload=None, method='POST'):
            calls.append((endpoint, method))
            return {'status': 'ok', 'piConfigured': True} if endpoint.endswith('/health') else {'device_id': 'pi-001', 'device_authenticated': True}
        self.assertTrue(doctor(sender, 'pi-001')['device_authenticated'])
        self.assertTrue(all(method == 'GET' for _, method in calls))
        with self.assertRaises(ValueError): doctor(lambda *a, **k: {}, 'pi-001')

    def test_configuration_does_not_execute_shell(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {}, clear=True):
            file = pathlib.Path(directory) / 'pi.env'
            file.write_text('XEDO_PI_TOKEN="$(echo do-not-run)"\nXEDO_PI_STATUS_JSON=\n', encoding='utf-8')
            load_config(file)
            self.assertEqual(os.environ['XEDO_PI_TOKEN'], '$(echo do-not-run)')

if __name__ == '__main__': unittest.main()
