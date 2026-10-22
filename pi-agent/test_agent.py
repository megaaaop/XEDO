import json
import tempfile
import unittest
import urllib.error
from agent import Spool, packet, read_status

class AgentTest(unittest.TestCase):
    def test_conflicting_queued_ids_preserve_original_endpoint_payload_and_state(self):
        with tempfile.TemporaryDirectory() as directory:
            spool = Spool(directory)
            payload = {'metadata': {'capture_id': 'CAP_fixture', 'incident_id': 'INC_fixture'}, 'file_base64': 'original-bytes', 'checksum': 'original-checksum'}
            endpoint = '/api/v1/captures'
            spool.enqueue('CAP_fixture', endpoint, payload)
            # Dictionary key order does not turn an identical retry into a conflict.
            spool.enqueue('CAP_fixture', endpoint, {'checksum': 'original-checksum', 'file_base64': 'original-bytes', 'metadata': {'incident_id': 'INC_fixture', 'capture_id': 'CAP_fixture'}})
            for state in ('queued', 'rejected'):
                spool.db.execute('UPDATE outbox SET state=? WHERE id=?', (state, 'CAP_fixture'))
                spool.db.commit()
                for other_endpoint, other_payload in [(endpoint, {**payload, 'file_base64': 'changed-bytes'}), (endpoint, {**payload, 'metadata': {'capture_id': 'CAP_fixture', 'incident_id': 'INC_other'}}), ('/api/v1/image-processing-results', payload)]:
                    with self.assertRaisesRegex(ValueError, 'ID_CONFLICT'):
                        spool.enqueue('CAP_fixture', other_endpoint, other_payload)
                original = spool.db.execute('SELECT endpoint,payload,state FROM outbox WHERE id=?', ('CAP_fixture',)).fetchone()
                self.assertEqual(original[0], endpoint)
                self.assertEqual(json.loads(original[1]), payload)
                self.assertEqual(original[2], state)
                self.assertEqual(spool.db.execute('SELECT COUNT(*) FROM outbox').fetchone()[0], 1)
            spool.db.close()

    def test_durable_spool_retry_and_unknown(self):
        with tempfile.TemporaryDirectory() as directory:
            spool = Spool(directory, limit=2)
            event = packet(spool, 'pi-001', None, 'live', read_status(None))
            self.assertIsNone(event['position'])
            self.assertIsNone(event['battery'])
            spool.enqueue(event['event_id'], '/api/v1/telemetry/batches', event)
            spool.enqueue(event['event_id'], '/api/v1/telemetry/batches', event)
            def offline(endpoint, data):
                raise urllib.error.URLError('network offline test')
            self.assertEqual(spool.send(offline, clock=lambda: 100), 0)
            spool.db.close()
            reopened = Spool(directory, limit=2)
            delivered = []
            self.assertEqual(reopened.send(lambda endpoint, data: delivered.append(data), clock=lambda: 200), 1)
            self.assertEqual(delivered[0]['event_id'], event['event_id'])
            self.assertEqual(reopened.status(), {})
            reopened.enqueue('one', '/test', {})
            reopened.enqueue('two', '/test', {})
            with self.assertRaises(OverflowError):
                reopened.enqueue('three', '/test', {})
            reopened.db.close()

if __name__ == '__main__':
    unittest.main()
