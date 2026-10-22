# XEDO developer handoff

## Workflow and implementation

Incident → versioned observation boundary → survey request snapshot → estimated plan → review/simulation/export → Pi imagery/status/processing results → CSV preview/import → report for the same incident.

The application uses HTML, CSS, JavaScript, and OpenLayers. Production runs a Worker API with D1 and R2; local development uses Node 24, SQLite WAL, and file storage. Python is used for the Pi agent. Planner, simulator, and laboratory validation modules are independent of the DOM.

The interface is English, with en-GB dates and numbers, Gregorian years, and Asia/Bangkok display times. Catalogue filters use UTC. Original system defaults are translated for presentation without changing stored records or user notes.

## Planner and simulator

- Profiles preserve speed m/s, altitude m and reference, swath m, endurance s, reserve fraction, and provenance. Unknown values remain null; example profiles are simulated.
- The basic planner supports one convex Polygon without holes or multipart geometry. Local UTM coordinates are used for distances. Existing spherical WGS84 area calculations remain estimates.
- No-go polygons are checked against survey, transit, home, and return legs. Crossing routes are blocked rather than exported. Automatic avoidance and mission splitting are not implemented.
- Plans retain source observation revision, profile snapshot, version, and metadata. A boundary change requires a new survey request and plan. Review uses actor/reason and revision guards.
- JSON/GeoJSON/CSV exports are standard XEDO data, not aircraft uploads. Dispensing is off for every segment.
- Duration uses distance/speed, per-row turns, and take-off/landing times. Missing timing inputs yield null; over-budget plans are blocked. Coverage, material mass, and battery use are not invented.
- Simulation is deterministic for its inputs, seed, start time, and version. Success, signal-loss, and dispenser-fault scenarios produce bounded logs, including partial results on failure.
- Logs are stored separately from run metadata with checksums. Replay preserves timestamps and never updates latest live Pi state. Flight dynamics, material behaviour, water currents, and autopilot SITL are not simulated.

## Experimental data and reports

CSV headers: sample_id, incident_id, mission_id, batch_id, treatment_group, collected_at, metric, value, unit, matrix, method, source_file, replicate, qualifier, detection_limit.

Preview validates UTC timestamps, entity references, unit/matrix combinations, and sample/metric/replicate duplicates before commit. Units are not automatically converted. Unknown and ND values remain null; below-detection values require a detection limit. Percentages are restricted to 0–100.

Imports support 1–500 rows and up to 220 KB of CSV. Source files retain checksums. Revisions require a reason and use optimistic conflict handling. Charts display raw values separately by metric, unit, matrix, and mode. Reports use one incident and an optional mission filter, with separate acquisition, capture, processing, collection, and export timestamps. Degradation efficiency is not calculated.

## APIs, devices, and persistence

Schemas and the route inventory are in `contracts/` and `public/contracts/`. Runtime validation is in `planning.js`, `operations.js`, and `lab.js`. Legacy `/api/*` remains available; new integrations should use `/api/v1/*`. Errors provide code, message, details, retryable, request_id, and HTTP status. Catalogue emptiness is separate from service outage.

The Pi channel is receive-only and uses device-specific server credentials. See the [Pi guide](/docs/pi-agent-en.md). GEE measurement configuration is described in the [connection guide](/docs/gee-connection-en.md). Actual credentials and hardware validation remain outstanding. Existing Site access is preserved.

D1 stores records and telemetry; R2 stores evidence, captures, CSV, and logs with ID/checksum references. Migration `0001` adds telemetry uniqueness and indexes without modifying deployed migration `0000`.

Backups include records, scenes, files, telemetry, latest state, and job metadata. Limits are 500 records, 5,000 telemetry events, 24 MiB of files, and 34 MiB total. Larger backups require administrator handling. Guards reject snapshots when records change; pause Pi ingestion first. Restore validates IDs, references, checksums, file types, and empty-workspace requirements. This is not a multi-team distributed snapshot protocol; retain original files and verify counts/checksums after large restores.

## Validation and remaining work

Local automated tests cover geometry, planning constraints, deterministic simulation, telemetry contracts, packet ordering, CSV validation, conflict handling, and cross-module backup/restore. Python fixtures validate the agent's durable spool and retries. These tests do not replace hardware acceptance.

Next steps are physical Pi/camera/dispenser-driver testing, measured profile calibration, actual GEE configuration and imagery integration, and model evaluation using representative datasets. Add operational flight or dispensing controls only after these research and integration steps are validated.
