# XEDO · Drone tracking

Open **Drone tracking** in the workspace, or `/dashboard.html#tracking`.

## Preview

The default view plays a sample route near Rayong with simulated GPS, altitude and battery. Pause, reset, interrupt and restore the signal, move the map, follow the drone, or export a GeoJSON track. Preview data stays in the browser and never enters the live device database. All exported preview features are marked `source_mode: simulated`.

## Live device

Choose **Live device** and select your device. XEDO reads the latest status and the most recent 300 telemetry samples from the device's current boot session every two seconds. Valid GPS fixes appear on the map. Invalid GPS and gaps longer than 10 seconds split the route; old device boots are excluded. The first received fix is a reference point, not a verified take-off location. Speed is calculated from consecutive GPS fixes, not read from an airspeed sensor.

GPS timestamps older than 5 seconds are marked outdated; after 15 seconds the signal is marked lost. These are display thresholds, not flight-control limits. A device heartbeat does not establish a current drone location. Unsynchronized or future GPS timestamps are marked unverified. When data stops, the last known fix remains visible and is identified as such; the app does not extrapolate the drone's position.

The GPS adapter must write actual measurements to the Pi agent's status JSON:

```json
{
  "position": {
    "latitude": 12.6617,
    "longitude": 101.2181,
    "altitude_m": 50,
    "altitude_reference": "MSL",
    "valid": true
  },
  "battery": null,
  "dispenser": null,
  "health": {"agent": "online", "fault_code": null}
}
```

This is a format example, not a live measurement. Use `position: null` or `valid: false` when no fix is available. Do not leave old coordinates marked valid: the GPS adapter must expire its source data. The existing agent uploads authenticated telemetry over HTTPS; configure the device token only on the server and Pi. Never put the token in the browser. Read [Pi 5 setup](pi5-setup.md) for installation and connection checks.

The flight-controller or manufacturer SDK adapter still depends on the actual drone model. It has not been installed or tested on a real drone. This release provides position monitoring and a simulated preview; it does not send flight commands.

## Read API

`GET /api/v1/devices/{device_id}/track?mode=live` returns device status, GPS freshness, a bounded session history, calculated distance/speed, coverage, and `server_time`. The source is the existing persisted telemetry stream; no new data table or flight-control permission is needed.
