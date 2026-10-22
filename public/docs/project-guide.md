# XEDO project guide

XEDO connects satellite observations with field surveys and experimental evidence. The research concept explores using drones to deploy beeswax-based microcapsules to collect spilled oil. The current dashboard supports image review, incident records, survey planning, simulation, and evidence management. It does not operate aircraft or dispense material.

Start with [Quick mission](/mission.html) for the three-step flow: Select an area → Satellite survey → Drone deployment preparation. Click or tap vertices to draw a polygon, then choose Finish area. The tools below remain available in Advanced workspace. Read the [Quick mission guide](/docs/quick-mission.md) for current connection limits.

## Satellite review

1. Choose a study area, UTC date range, and imagery source.
2. Search the Sentinel-2 catalogue. Open **Search results** to select an image.
3. Open **Image details** for acquisition time, product ID, resolution, provider, and cloud cover.
4. Draw a boundary or import a WGS84 GeoJSON Polygon. Explain the observed features and image limitations.
5. Link the observation to an incident and save it. Boundaries retain source images and revision history.

Image review and incident verification have separate statuses. A visible RGB feature alone does not confirm oil. Confirmation requires matching field or independent evidence and an explanation of its time and location relationship to the imagery.

The default pilot area is the Rayong coast, Thailand. Displayed dates use English month names and Gregorian years. Local times use Asia/Bangkok (ICT, UTC+7); catalogue search dates use UTC.

## Incidents and surveys

Use **Incidents** to filter records, view observations and evidence, review an incident, or request a field survey. Original evidence files, collection times, reviewer notes, and status changes remain traceable.

**Survey requests** retain boundary snapshots. Export GeoJSON or CSV and link survey findings back to the original incident.

## Mission planning

Select a survey request, target boundary, and versioned device profile. Enter a home position, track spacing, optional track angle, and optional no-go polygons.

The basic planner supports one convex Polygon without holes. Routes are calculated in local UTM metres. Estimates include transit and return legs, movement time, turn time, and take-off/landing time when those inputs are available. A plan that crosses a no-go area or exceeds its endurance budget is blocked.

Example profiles are simulated. Unknown values remain unknown. JSON, GeoJSON, and CSV exports are standard XEDO formats; exporting does not upload a mission to a drone. Dispensing is off on every segment.

## Monitoring and replay

- **Simulated:** deterministic route simulation with success, signal loss, and dispenser fault scenarios.
- **Replay log:** inspect saved or imported events with their original timestamps.
- **Live Pi data:** receive authenticated device observations when the server channel is configured. Unmeasured values remain unknown.

Simulation and replay do not update live device state. A heartbeat confirms communication, not flight or dispenser calibration. See the [Pi agent guide](/docs/pi-agent-en.md).

## Results and reports

Import original field imagery and processing results. Bounding boxes use pixel coordinates rather than geographic coordinates. Uploading an image does not run a processor.

Preview experimental CSV data before committing it. Preserve units, sample matrix, source file, measurement time, qualifiers, detection limits, and revisions. Unknown and non-detect values are not treated as zero. Charts display raw measurements without inventing trends or combining incompatible units.

Reports link evidence, imagery, plans, logs, and measurements to one incident, with an optional mission filter. Export JSON or print the report. Route estimates remain separate from measured experimental results.

## Connection indicator

The map header shows a Wi-Fi symbol and GEE HTTP round-trip time. Green is below 300 ms, yellow is 300–999 ms, and red is 1,000 ms or above, or a failed request. Grey with **— ms** means no valid measurement is available. These are dashboard thresholds, not a Google service guarantee.

GEE credentials are not configured yet. Current imagery uses Sentinel-2 catalogue data and archived previews. GEE imagery layers are a subsequent integration step. See the [GEE connection guide](/docs/gee-connection-en.md).

## Settings and backup

Manage study areas, review image preparation jobs, and download a backup containing records and original evidence files. Restore requires a workspace without existing incident or mission data. Credentials are excluded from backups and exports.

## Development roadmap

1. Establish reliable satellite review, incident evidence, and survey planning.
2. Connect the team's Pi, camera, and dispenser status adapter; validate timestamps, units, device identity, and retries on hardware.
3. Configure GEE authentication, validate latency measurements, and integrate approved imagery layers.
4. Build SAR baseline data and evaluate segmentation models using training, validation, and test sets separated by incident, location, and time.
5. Validate drone and microcapsule experiments before adding operational controls or treatment calculations.

Training controls, AI confidence scores, oil-volume estimates, material dosing, and degradation-efficiency calculations are not enabled in this version.

For implementation details, read the [developer handoff](/docs/handoff-en.md).
