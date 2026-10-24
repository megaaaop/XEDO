# XEDO planning trial: method and limits

The [mission trial page](/planning.html) keeps three user steps: **Select an area → Satellite survey → Drone deployment**. Four calculations run behind that flow: drift scenarios, camera/flight estimates, a checked QGroundControl file adapter, and an oil/material quantity range. Configure them through **Mission settings** and inspect reports through **Calculation details**. Entering deployment or changing relevant settings recalculates the available results automatically. Results are estimates from supplied inputs. Completing the manual export checks is not flight approval.

## Source, snapshots and service boundaries

The hosted version opens directly on a real GEE Sentinel-2 background, before any polygon is selected. The background is a mosaic of up to 31 intersecting acquisitions in the recent 30-day UTC window, with newer scenes on top and the actual source date range displayed. Panning or zooming updates its bounded display area; it does not change the inspection polygon. Hosted mode does not silently substitute OpenStreetMap if imagery fails. The portable offline file retains its OSM basemap and archived satellite preview.

Draw or import a trial polygon over the GEE background, then choose **Review area image**. XEDO searches GEE and displays the newest fully covering Sentinel-2 acquisition within the current date and cloud limits. The acquisition controls remain available to search and choose another image. Background imagery alone never enables mission preparation. Review the displayed single acquisition and its timestamp before preparing a mission. Hosted mode does not persist surveys. The retained workspace can also start from a saved Quick mission survey, using its original frozen boundary snapshot, scene ID and acquisition time. Later edits to the current observation do not replace that snapshot. A trial boundary or drift envelope is a search scenario; it does not confirm oil or measure its extent.

Trial calculation, source retrieval and file export perform no database mutations. In workspace server mode, the separate survey action uses the original Quick mission APIs to save an area and the reviewed inspection before calculation; reopening an existing survey uses its frozen image and boundary. The calculation and export actions do not create or update incidents, observations, persisted MissionPlans, runs or device commands. A downloaded JSON snapshot contains the submitted inputs, source, results and `inputHash`; it is a local artifact, not a saved operational mission. Restoring a snapshot restores inputs and requires recalculation. Times and validity checks must be refreshed before exporting again. The hash identifies the calculation inputs; it is not a digital signature or approval.

The pure calculation modules do not fetch data themselves. The separate read-only environment API retrieves GFS wind and SMOC current forecasts through Open-Meteo and supplies progressive inputs to the existing calculators. Official airspace restrictions and AI oil detection are not fetched. The separate satellite-review step now searches actual GEE Sentinel-2 scenes by area, acquisition dates and cloud threshold, and loads RGB map tiles through the XEDO server. It validates full boundary coverage and waits for image loading before deployment is enabled. A boundary/source change or expired image session revokes image review. Source errors revoke readiness and require retry; the interface does not automatically replace failed GEE requests with an example image. An archived source remains available by explicit selection. The offline local-file build uses only its embedded archived Sentinel-2 image.

The current source includes bounded imagery and read-only environmental API adapters alongside the static frontend and browser calculations. Google credentials remain on the server; the browser needs no Google secret, Pi token or aircraft connection. The full workspace has a separate access boundary, saved-image workflow and historical GEE planning context. See [API integration](api-integration.md).

## Estimated demo

Choose **Estimated demo** to opt into assumed aircraft inputs: starting usable energy 177.6 Wh, landing reserve 44.4 Wh, average loaded power 600 W, test wind threshold 8 m/s, test maximum airspeed 12 m/s, takeoff/climb 30 s, landing 30 s and each turn 5 s. The hypothetical 22.2 V, 10 Ah pack is 222 Wh nominal; 80% starting usable energy and a 25% reserve of that starting energy leave a 133.2 Wh mission budget. These values do not verify battery compatibility or aircraft performance. Camera NoIR v2 remains a candidate and PX4 is only the demo export target.

The interface retains Select an area → Satellite survey → Drone deployment and the same drift, flight, export and oil calculators. Demo imagery uses the bundled dated Sentinel-2 crop; calculations run locally even in the HTTP preview. The demo does not fetch automatic environment/GEE context, create saved inspections or transmit hardware commands. Its calm wind, drift vectors, home, constraints and oil thickness are synthetic. Source coverage checks and all three manual export confirmations still apply.

**Use mission inputs** restores the previous raw form values and boundary, with imagery/export review required again. Reloading the demo preserves that first backup; drawing, importing a boundary or clearing the demo area retains the demo label. The backup is held only in the current tab; download a real mission snapshot before closing the page if it must persist. Snapshot downloads carry `exampleData: true` plus the estimated `demoProfile`; demo snapshot and mission filenames begin with `XEDO-estimated-demo-`. Older test snapshots remain compatible. The Information button contains the assumptions without expanding the main workflow.

## Automatic environmental inputs

Use Mission conditions to choose the planned takeoff/end window. The server adapter samples up to five points inside the AOI, requests hourly brackets and validates model-run metadata, SI units, provider-grid locations and missing values. Weather uses GFS `gfs_global`; marine currents use `meteofrance_currents` (SMOC, including tidal and Stokes contributions). Wind is FROM true north, current is TO true north; vectors are converted before averaging. No tidal or Stokes term is added again.

The trial covers the Thailand region 97–106° E / 5–21° N, polygons within 100 km, windows no longer than 24 h, at most five days back and seven days ahead. This bounding box is a request limit, not proof of local environmental coverage. Weather is a roughly 13 km grid; currents are roughly 9 km. The 50 m flight estimate interpolates the 10/80 m vectors explicitly. Currents in narrow estuary/mangrove channels remain unavailable in Automatic mode. Missing data stays null, including gusts.

Compatible data is collapsed into an equivalent time-weighted/spatial mean for the existing constant-vector drift model. This is not a resolved particle-transport or channel-hydrodynamic model; intermediate displacement/envelope can differ when forcing varies. Sampled flight-wind extremes and available 10 m gusts are checked separately so opposite vectors do not make unsafe conditions disappear in the mean. Original image timestamps and the 24-hour drift limit remain unchanged.

Automatic data refreshes on relevant context changes and at most every ten minutes while active. Cache/fetch time does not replace model run/validity time. A failed/expired lookup revokes auto-owned values and affected reviews; a new AOI cannot receive an old request's response. Automatic evidence is retained under flight/drift inputs, and export recomputes expiry, geometry and scheduled-window coverage. Manual/test mode is isolated. The environment endpoint writes no database records and sends no device commands.

## 1. Constant-vector drift scenarios

Supply observation, arrival and survey-end timestamps with a UTC offset; surface-current components in **m/s toward true east/north**; and 10 m wind in **m/s**, with its **FROM direction in degrees clockwise from true north**. Missing vectors remain unknown; the calculator does not assume calm conditions.

For wind speed `W`, FROM bearing `theta`, windage `alpha` and time since observation `t` in seconds:

```text
windEast  = -W * sin(theta)
windNorth = -W * cos(theta)
eastShiftM  = (currentEastMps  + alpha * windEast)  * t
northShiftM = (currentNorthMps + alpha * windNorth) * t
```

The implementation converts degrees to radians and rotates true east/north into the local UTM grid. Nominal windage is fixed in this project's interface at **0.03**, with scenarios at **0.025 / 0.03 / 0.04**; lateral margin is fixed at **0 m**. These are project assumptions, not a calibrated site model. Environmental inputs remain explicit and unknown values stay missing. The search envelope is the UTM axis-aligned bounding box of the source polygon shifted at arrival and end for the three windage values, expanded by the profile margin on each axis. It is not the physical union of oil or a statistical confidence region. The underlying calculator still accepts explicit settings from other callers.

The horizon is bounded to **24 hours**; source/envelope dimensions and scenario shifts are bounded to **100 km**. Latitude is limited to ±80° and date-line crossings are unsupported. Projection scale distortion is not corrected. Diffusion, waves, shoreline interaction, weathering and spatially changing vectors are absent. The envelope does not prove a moving slick will be photographed. Drift-enabled file export additionally checks that the arrival/end envelope covers the entire scheduled flight window.

## 2. Camera geometry, wind and battery trial

The model uses sensor width/height and focal length in **mm**, active image width/height in **pixels**, requested height in **m AGL**, ground speed in **m/s**, overlap as fractions from **0 to less than 1**, and minimum capture interval in **seconds**. The XEDO interface supplies these from its fixed project profile; generic calculator callers supply their own explicit settings. Image width is assumed across track, image height along track, with a nadir camera and a planar surface.

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

The `XEDO Prototype 01` profile stores fixed equipment candidates and project constants in `src/planning-hardware-profile.js`, enforced in the interface by `src/planning-fixed-settings.js`. It locks candidate NoIR v2 stock/full-sensor geometry (3.68 × 2.76 mm, 3.04 mm focal length, 3280 × 2464 px) and preview assumptions of 50 m AGL, 5 m/s, 70% side overlap, 80% front overlap and a 1 s capture interval. These values permit a geometric route on the selected inspection polygon without loading the synthetic example. They are available through the profile Information button rather than editable mission fields. The profile does not supply wind, real home, battery energy/power, firmware, flight permissions or oil evidence. Every UI calculation/export applies the constants; explicitly conflicting snapshot constants reject the import before any mission changes. Missing constants in a compatible snapshot are filled from the current profile. The generic calculator and API retain their explicit-input contracts.

Wind east/north components, the environmental wind-speed limit and the aircraft airspeed limit are separate explicit inputs. Required airspeed is estimated as the magnitude of the target ground-velocity vector minus the supplied wind vector. The implementation transforms true east/north to the local route grid and checks each leg at its start, midpoint and end. Manual mode assesses its supplied constant vector. Automatic mode additionally assesses every sampled forecast vector and available 10 m gust proxy on each leg; neither mode validates manoeuvrability or site conditions.

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

Fixed project constants in the interface are density **0.86 g/mL**, capacity **3.42 g/g**, allowance **1.5** and target fraction **1**. Change the project configuration to revise these assumptions. The generic oil calculator remains configurable. The project-supplied capacity remains unverified by this calculator. Capacity must match the tested oil, conditions and whole-capsule dry-mass basis. The allowance is not a confidence interval. Retained oil is not necessarily removed and recovered oil.

For an emulsion-layer thickness, supply the measured oil volume fraction; it is not assumed. An absent upper thickness leaves upper volume/mass/material outputs unknown. Missing thickness evidence is not inferred from RGB/NoIR appearance. This estimator produces a mass range, not capsule count, a calibrated field dose, delivery scheduling or release instructions.

## HTTP contract

Default Vercel hosting provides these imagery endpoints through `api/gee.mjs`:

| Route | Purpose |
|---|---|
| `POST /api/v1/gee/imagery/basemap` | Bounded viewport geometry → fixed recent Sentinel-2 mosaic, acquisition range and 30-minute tile session |
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

## GEE mission context in the local trial

The new read-only `POST /api/v1/gee/planning-context` supplies advisory data to the current three-step planner without changing its four calculation engines. **GEE planning data** opens its compact report; source and calculation explanations remain collapsed.

| Source | Calculation | Limit |
| --- | --- | --- |
| Copernicus `DEM/GLO30_2024_1` | Elevation samples, AOI minimum/maximum, optional selected-Home estimate and 3D point context | Historical 30 m DSM, EGM2008; masked pixels remain Unknown; no obstacle or launch-level certification |
| ESA `WorldCover/v200` | Mapped, water, mangrove, land and unknown area fractions | Historical 2021 classes at 10 m; no silent route clipping or legal no-go declaration |
| Selected Sentinel-2 + cloud probability/SCL | AOI clear/cloud/unknown fractions with canonical scene acquisition and coverage | 20 m analysis grid, thresholded probability or explicit SCL fallback; source date is never retimestamped |
| NOAA `GFS0P25` | 10 m east/north wind, speed, FROM direction and available gust near scheduled takeoff | One regional roughly 28 km reference; no replacement for whole-flight 50 m wind assessment |

The Home estimate is never filled automatically. A reviewer checks the actual launch elevation and compatible height reference, then explicitly chooses **Use reviewed estimate**. The copied value carries point/dataset/datum/review provenance; changing the point or value invalidates that provenance. A static reviewed elevation can remain valid across context refreshes at the same Home, while all other flight/airspace reviews and validity checks still apply. Export refuses inconsistent point/value/datum evidence. Imported snapshots require a new review rather than restoring approval.

The existing flight path, height, image footprint, battery model, drift scenarios, oil calculation and release-off behavior remain in place. A 3D view may show GEE surface-model samples while route heights remain a flat illustration. Actual battery energy, reserve, loaded power, wind/airspeed limits, phase allowances, installed firmware, launch location and reviewed airspace constraints still need project or field inputs. Optional oil/drift evidence requirements are unchanged. Missing local GEE configuration leaves context Unknown; software fixtures are not live Earth Engine validation.
