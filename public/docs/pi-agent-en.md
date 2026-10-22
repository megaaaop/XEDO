# XEDO Pi agent · receive-only contract 1.0

This version receives still images, existing processing results, and dispenser status. It has no API for flight commands, GPIO/PWM control, or material dispensing. Validation has used a local Python agent and API fixtures, rather than physical Pi, camera, or dispenser hardware.

## Configuration

For Raspberry Pi 5, use the [installation kit and automatic startup guide](pi5-setup.md). The kit adds a persistent telemetry uploader and a read-only connection check.

Use Python 3.11 or later. The agent uses only the standard library. Copy `pi-agent/agent.py` to the Pi. Set `XEDO_API_URL` to the team's authorised HTTPS backend, or localhost through a tunnel.

- `XEDO_PI_TOKEN`: matching device credential on the server and Pi. Keep it out of Git, browser storage, and exports.
- `XEDO_PI_DEVICE_ID`: server default `pi-001`.
- A private Site also requires existing service access through `XEDO_SITE_ACCESS_TOKEN`. The agent sends `OAI-Sites-Authorization` only to the configured Site. This implementation does not create or distribute new access credentials.
- The local server reads process environment values and exposes the owner's workspace on loopback.
- Without a Pi token, the live API returns `DEVICE_NOT_CONFIGURED`; the interface shows unknown values.

```bash
python agent.py --spool spool --device pi-001 heartbeat --count 10 --clock-quality unknown
python agent.py --spool spool flush
python agent.py --spool spool status
```

Use `clock-quality synced` only after synchronising the clock. Existing adapters can write `status.json` and send it with `heartbeat --status-json status.json`.

```json
{
  "position": null,
  "battery": null,
  "dispenser": {
    "state": "unknown",
    "driver_version": null,
    "requested_setting": null,
    "measured_rate_kg_s": null,
    "measured_remaining_kg": null,
    "measured_released_kg": null,
    "fault_code": null
  },
  "health": {"agent": "online", "fault_code": null}
}
```

Position contains longitude/latitude/valid and optional altitude_m with an altitude_reference of AGL/MSL/ellipsoid/unknown. Battery percent is measured drone battery data, not the Pi power supply. Requested settings use value/unit (`pwm_percent`, `rpm`, or `duty_fraction`) and remain separate from measured mass or rate.

## Images and processing

Use `contracts/capture.schema.json`. Reference existing capture, device, and incident IDs. Include a timezone in UTC timestamps. Width/height are pixel counts or null.

```bash
python agent.py image field-image.jpg capture-metadata.json
python agent.py result processing-result.json
```

Existing files use capture_mode `imported`. With a compatible camera, `capture output.jpg capture-metadata.json` invokes `rpicam-jpeg` with a timeout. Only successful captures are labelled `captured_live`; this step has not been tested on hardware.

Processing results contain run_id, capture_id, algorithm_version, parameters, duration_ms, bboxes, coordinate_space, processed_at, and reason. Bounding boxes are `[x1,y1,x2,y2]` within image dimensions. Pi imagery is not georeferenced in this version. Without a processor, use status `unavailable`, coordinate_space `none`, and no detections.

Choose a driver using the [Raspberry Pi camera documentation](https://www.raspberrypi.com/documentation/computers/camera_software.html). The sender uses [Python urllib.request](https://docs.python.org/3/library/urllib.request.html).

## Spooling, retries, and ordering

- SQLite WAL retains payloads, image copies, and original event IDs until successful delivery. Limits are 1,000 items or 64 MiB of JSON. At capacity, reject new items with `spool_overflow` and preserve existing items.
- Timeouts, network failures, HTTP 429, and 5xx responses use 2–60 second retry backoff. Other 4xx responses remain rejected for inspection.
- Identical event IDs and payloads are duplicates. Changed payloads or reused boot/sequence pairs with different IDs are conflicts.
- Old packets cannot move latest state backwards within a boot or after reboot. Unknown clock quality across boots requires synchronisation review.
- Linux boot_id and persisted sequence are used when available. Without `/proc`, a persistent fallback boot ID supports local testing.
- Live polling is every 2 seconds. Test thresholds are stale after 5 seconds and disconnected after 15 seconds. Heartbeat does not verify flight.
- Raw events are separate from latest state. Replay and simulation do not write live state.

## Hardware acceptance

Record Pi model, operating system, camera, processor, and dispenser driver under **Monitor & Replay → Device inventory**. Verify an image, actual timestamps, units, bounding boxes, and nulls for unmeasured values. Disconnect/reconnect the network and reboot to check deduplication and packet ordering. Test the dispenser driver on a bench before operational control.

`python -m unittest discover -s pi-agent -p test_agent.py` tests durable spooling, retry, idempotency, and overflow with local fixtures only.
