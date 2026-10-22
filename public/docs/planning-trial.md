# XEDO planning trial: method and limits

The [mission trial page](/planning.html) keeps three user steps: **Select an area → Satellite survey → Drone deployment**. Four calculations run behind that flow: drift scenarios, camera/flight estimates, a checked QGroundControl file adapter, and an oil/material quantity range. Configure them through **Mission settings** and inspect reports through **Calculation details**. Entering deployment or changing relevant settings recalculates the available results automatically. Results are estimates from supplied inputs. Completing the manual export checks is not flight approval.

## Source, snapshots and service boundaries

In the default hosted version, draw or import a trial polygon, then choose **Load satellite image**. XEDO searches GEE and displays the newest covering Sentinel-2 acquisition within the current date and cloud limits. The acquisition controls remain available to search and choose another image. Before loading, the map is an OpenStreetMap basemap; the visible map status distinguishes it from satellite imagery. Review the displayed source and acquisition time before preparing a mission. Hosted mode does not persist surveys. The retained workspace can also start from a saved Quick mission survey, using its original frozen boundary snapshot, scene ID and acquisition time. Later edits to the current observation do not replace that snapshot. A trial boundary or drift envelope is a search scenario; it does not confirm oil or measure its extent.

Trial calculation, source retrieval and file export perform no database mutations. In workspace server mode, the separate survey action uses the original Quick mission APIs to save an area and the reviewed inspection before calculation; reopening an existing survey uses its frozen image and boundary. The calculation and export actions do not create or update incidents, observations, persisted MissionPlans, runs or device commands. A downloaded JSON snapshot contains the submitted inputs, source, results and `inputHash`; it is a local artifact, not a saved operational mission. Restoring a snapshot restores inputs and requires recalculation. Times and validity checks must be refreshed before exporting again. The hash identifies the calculation inputs; it is not a digital signature or approval.

The calculation modules do not fetch live weather, current forecasts, official airspace restrictions or an AI prediction. The separate satellite-review step now searches actual GEE Sentinel-2 scenes by area, acquisition dates and cloud threshold, and loads RGB map tiles through the XEDO server. It validates full boundary coverage and waits for image loading before deployment is enabled. A boundary/source change or expired image session revokes image review. Source errors revoke readiness and require retry; the interface does not automatically replace failed GEE requests with an example image. An archived source remains available by explicit selection. The offline local-file build uses only its embedded archived Sentinel-2 image.

Default Vercel hosting exposes only the bounded imagery API alongside the static frontend and browser calculations. Google credentials remain on the server; the browser needs no Google secret, Pi token or aircraft connection. The full workspace has a separate access boundary, saved-image workflow and historical GEE planning context. See [API integration](api-integration.md).

## 1. Constant-vector drift scenarios

Supply observation, arrival and survey-end timestamps with a UTC offset; surface-current components in **m/s toward true east/north**; and 10 m wind in **m/s**, with its **FROM direction in degrees clockwise from true north**. Missing vectors remain unknown; the calculator does not assume calm conditions.

For wind speed `W`, FROM bearing `theta`, windage `alpha` and time since observation `t` in seconds:

```text
windEast  = -W * sin(theta)
windNorth = -W * cos(theta)
eastShiftM  = (currentEastMps  + alpha * windEast)  * t
northShiftM = (currentNorthMps + alpha * windNorth) * t
```

The implementation converts degrees to radians and rotates true east/north into the local UTM grid. Nominal windage defaults to **0.03**, with scenarios at **0.025 / 0.03 / 0.04**; lateral margin defaults to **0 m**. These are project assumptions, not a calibrated site model. Explicit nulls remain missing. The search envelope is the UTM axis-aligned bounding box of the source polygon shifted at arrival and end for the three windage values, expanded by the supplied margin on each axis. It is not the physical union of oil or a statistical confidence region.

The horizon is bounded to **24 hours**; source/envelope dimensions and scenario shifts are bounded to **100 km**. Latitude is limited to ±80° and date-line crossings are unsupported. Projection scale distortion is not corrected. Diffusion, waves, shoreline interaction, weathering and spatially changing vectors are absent. The envelope does not prove a moving slick will be photographed. Drift-enabled file export additionally checks that the arrival/end envelope covers the entire scheduled flight window.

## 2. Camera geometry, wind and battery trial

Enter measured sensor width/height and focal length in **mm**, active image width/height in **pixels**, requested height in **m AGL**, ground speed in **m/s**, overlap as fractions from **0 to less than 1**, and minimum capture interval in **seconds**. Image width is assumed across track, image height along track, with a nadir camera and a planar surface.

```text
footprintAcrossM = altitudeM * sensorWidthMm  / focalLengthMm
footprintAlongM  = altitudeM * sensorHeightMm / focalLengthMm
gsdXM = footprintAcrossM / imageWidthPx
gsdYM = footprintAlongM  / imageHeightPx
lineSpacingM  = footprintAcrossM * (1 - sideOverlap)
photoSpacingM = footprintAlongM  * (1 - frontOverlap)
triggerIntervalS = photoSpacingM / groundSpeedMps
```

Camera-derived line spacing must fit the tested **5–1000 m** route range; infeasible spacing or capture interval is blocked rather than clamped. Camera presets are candidate values, not proof of the installed module, lens, crop or focus. Raspberry Pi documents that [NoIR cameras capture visible plus infrared light because they lack the infrared filter](https://www.raspberrypi.com/documentation/accessories/camera.html). XEDO does not treat those mixed image channels as calibrated multispectral bands or infer oil thickness from their colour. Confirm the actual module, optics, image dimensions, mounting and capture timing independently.

Wind east/north components, the environmental wind-speed limit and the aircraft airspeed limit are separate explicit inputs. Required airspeed is estimated as the magnitude of the target ground-velocity vector minus the supplied wind vector. The implementation transforms true east/north to the local route grid and checks each leg at its start, midpoint and end. This is a constant-vector trial, not a live forecast or a manoeuvrability model.

An explicit manual home is required for assessed sorties. Each sortie includes outbound transit, survey work, return to that home, takeoff, landing and turn-time allowances. The energy model is:

```text
budgetWh = usableStartingWh - reserveWh
travelS = routeDistanceM / groundSpeedMps
durationS = takeoffS + travelS + turnCount * turnS + landingS
energyWh = uniformPowerW * durationS / 3600
```

The bounded solver partitions whole survey segments into sorties fitting the supplied budget and wind/airspeed limits. Each sortie assumes a fresh starting-energy budget; final reserve is retained after landing. Uniform power is an explicit assumption and does not model wind-dependent electrical load, battery degradation, voltage sag or payload changes. Sharp polyline turns, obstacles and aircraft performance are unvalidated. Without manual home, the first boundary vertex is used only as a diagram assumption. Missing inputs never become measured zeroes or successful assessments.

## 3. QGroundControl trial file

The adapter targets **QGroundControl 5.1.x**, Plan version **1**, mission version **2**, and the explicitly selected **PX4 or ArduPilot multicopter** profile. Selection does not prove the firmware installed on a Cube carrier. DJI WPML/KMZ export is not implemented.

Before download, camera, wind and battery calculations must pass. Supply the real home position and its **AMSL altitude**, confirm the home, and confirm that the surveyed surface is level with the takeoff surface. Only this explicit same-level assumption permits this trial to map AGL geometry to **height relative to home**. It is not a terrain-following export. The relative-home height must match every assessed waypoint and stay below the manually supplied relative-home ceiling.

Record a manual constraint source, review confirmation, future planned takeoff, validity expiry and requested lateral corridor in **m**. Supply reviewed no-go Polygons or an explicit empty FeatureCollection after review. Whole outbound, survey and return segments are checked against those polygons and their requested corridor; boundary contact also blocks export. Polygons with holes, MultiPolygons and other unsupported geometry are rejected. These are user-attested constraints; there is no automatic official airspace lookup. No-go polygons and ceiling checks are not installed as onboard geofences or controller limits.

Validity must cover all summed airborne sortie durations and any supplied later `plannedEndAt`. Add battery-change and ground delays explicitly through that end time. One file is downloaded per selected sortie: **TAKEOFF → explicit ground-speed setting → route and return waypoints → LAND at home**. The file contains no camera-capture triggers, arm, start, servo or capsule-release commands. Download does not transfer it to an aircraft. Native QGC import, firmware compatibility and isolated SITL acceptance remain **untested**.

Format references: [official QGC Plan format](https://docs.qgroundcontrol.com/Stable_V5.1/en/qgc-dev-guide/file_formats/plan.html), [QGC v5.1 altitude-frame enum](https://github.com/mavlink/qgroundcontrol/blob/v5.1.0/src/QmlControls/QGroundControlQmlGlobal.h), and [MAVLink frames/commands](https://mavlink.io/en/messages/common.html). The adapter uses home-relative frame 3 and QGC relative-altitude mode 1.

## 4. Oil and capsule quantity range

Supply independently reviewed oil pixels with **GSD in m/pixel**, or a separately measured oil area in **m²**. The search boundary/envelope is never substituted for oil area. Supply thickness bounds in **µm**, density in **g/mL**, sorption capacity in **g oil/g dry whole capsules**, oil volume fraction and target oil fraction as **0–1** fractions, and an allowance multiplier.

```text
areaM2 = pixelCount * gsdXM * gsdYM        # or manual oil area
volumeL = areaM2 * thicknessUm * 0.001 * oilFraction
oilMassKg = volumeL * densityGml
capsulesKg = oilMassKg * targetFraction / capacityGg * allowance
```

Project defaults are density **0.86 g/mL**, capacity **3.42 g/g**, allowance **1.5** and target fraction **1**. The project-supplied capacity and all overrides remain unverified by this calculator. Capacity must match the tested oil, conditions and whole-capsule dry-mass basis. The allowance is not a confidence interval. Retained oil is not necessarily removed and recovered oil.

For an emulsion-layer thickness, supply the measured oil volume fraction; it is not assumed. An absent upper thickness leaves upper volume/mass/material outputs unknown. Missing thickness evidence is not inferred from RGB/NoIR appearance. This estimator produces a mass range, not capsule count, a calibrated field dose, delivery scheduling or release instructions.

## HTTP contract

Default Vercel hosting provides these imagery endpoints through `api/gee.mjs`:

| Route | Purpose |
|---|---|
| `POST /api/v1/gee/imagery/search` | Search a polygon/date range/cloud threshold for covering Sentinel-2 scenes |
| `POST /api/v1/gee/imagery/map` | Recheck the selected scene and create a 30-minute same-origin tile session |
| `GET /api/v1/gee/imagery/tiles/{sessionId}/{z}/{x}/{y}` | Display RGB PNG tiles; zoom 0–18 |

The hosted planning calculations and file export run in the browser. The server exposes fixed imagery operations, with JSON bodies bounded to 64 KiB, and accepts no arbitrary EE expression or upstream URL. Searches span at most 90 days and a polygon no wider or taller than 100 km. Scene cloud metadata and acquisition dates describe the source imagery; they do not establish present conditions or oil detection.

The following planning endpoints belong to the retained workspace server and are not exposed by the default Vercel imagery adapter:

| Route | Purpose | Result |
|---|---|---|
| `GET /api/v2/planning-trial/source?survey=...` | Read a saved Quick mission snapshot | Source geometry, survey/incident/scene linkage |
| `POST /api/v2/planning-trial` | Recalculate trial from supplied inputs | Source, target, drift, flight, manual export checks and oil values |
| `POST /api/v2/planning-trial/export` | Recalculate and check again, then build one file | JSON envelope containing `.plan` filename, MIME type, text and report |

POST bodies are JSON, bounded to **64 KiB**. Same-origin rules apply. `surveyId` and replacement `geometry` cannot both be supplied. `sortieIndex` is zero based for export. HTTP 200 calculation can contain incomplete or blocked component states; inspect each result. Export returns 422 when checks or the selected sortie are invalid. Successful JSON trial responses use `Cache-Control: no-store`; unsupported methods return an empty 405 response with `Allow`.

The [OpenAPI inventory](../contracts/openapi.json) and `planning-trial-*.schema.json` describe the workspace planning envelope contracts. Nested calculator inputs and detailed geometric relationships are documented here and validated by runtime code; the inventory does not claim a complete typed contract for every legacy API. All trial results keep `hardwareControl: false` and `releaseControl: false`.

The trial conservatively requires scheduled takeoff at or after drift `arriveAt` and the full scheduled end at or before drift `endAt`. It does not infer when the first survey acquisition occurs during transit. Include transit and ground delays in the chosen coverage window. Invalid module settings return a blocked component report while unrelated tools remain available. Restoring a snapshot clears manual export confirmations for fresh review; offset timestamps are normalized to UTC. Route/home/constraint edits clear the relevant confirmations.

## Local file edition

Run `npm run build:file` to create `output/standalone/XEDO-Planning-Trial.html`, or pass an .html output path to `node scripts/build-planning-file.mjs`. Double-click the resulting file. It embeds the calculators, scripts, styles, logo, stored Sentinel-2 preview, 3D renderer and method notes; no local HTTP server or port is needed. Map tiles still require internet. All four calculators and file downloads also work offline.

Saved survey lookup by ID is unavailable in file mode and in the default hosted version. Import GeoJSON or a JSON trial snapshot containing the source geometry. Imported survey linkage is unverified: new calculations treat that geometry as a local trial boundary, preserve no live database connection, and require fresh export confirmations. The hosted version uses the GEE imagery API; the retained workspace server additionally supports saved surveys. The local-file build includes no GEE credentials or live imagery API.

The standalone stored image is the original archived source dated 29 September 2026, not a live GEE observation. An area outside its prepared crop is rejected. The synthetic test configuration does not turn that image into a current oil observation. Missing physical inputs stay unknown and appear as Settings needed. QGC import, SITL and aircraft acceptance remain outside these interface checks.
