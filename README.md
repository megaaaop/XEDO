# XEDO · Coastal inspection draft

XEDO is an environmental innovation prototype for reviewing coastal satellite imagery and preparing a drone inspection plan. This package contains the latest three-step interface, the XEDO logo, Information dialogs, four planning calculators, and the retained workspace source.

The default deployment combines a **static browser application** with bounded **GEE imagery**, **GEE planning-context** and **environmental-data APIs** on Vercel. A real Sentinel-2 mosaic loads as the background on opening, before an inspection polygon is drawn. Its source date range is displayed. The separate area-review step loads one covering acquisition with its exact timestamp. Google credentials never enter the browser. Planning calculations still run in the browser. The retained database, Pi, aircraft and dispenser APIs remain separate from this deployment.

## Workflow

1. **Select an area:** draw and remove a polygon, or import trial geometry. Select, move or clear the **Launch / Return** point on the map; both transit legs enter the flight assessment.
2. **Satellite survey:** search GEE by acquisition dates and scene cloud cover, choose a fully covering Sentinel-2 image, and load it for review. The image's acquisition time is displayed. Archived imagery is available only by explicit selection. Neither source confirms oil detection.
3. **Drone deployment:** review the 2D/3D route and the visible **Flight readiness** checklist, then download a trial flight plan when its checks pass. Missing settings are listed beside the download button.

Automatic takeoff is anchored to one hour after the first successful route analysis. Automatic condition/model refreshes retain that anchor; **Replan** creates a new one. Editing the takeoff/end fields switches to a manual schedule. The window adds a five-minute scheduling buffer and ten minutes between sorties to the assessed flight duration. An expired takeoff blocks downloading until replanned or edited.

The automatic surface option compares Home, inspection-area and up to 24 route locations using the 30 m Copernicus DSM in EGM2008. All requested samples must be known and within the configurable comparison tolerance (default 2 m, an unverified model assumption). Its model Home height and provenance remain separate from a manually reviewed reference. Sparse historical samples do not verify actual obstacles or flight clearance; larger differences and missing samples require review. Airspace review remains an explicit user check.

Background-map metadata requests retry once after a transient timeout, transport failure or supported temporary HTTP error. Cancelling or changing the view cancels that attempt and any queued retry. Missing configuration, permission errors, invalid responses and empty imagery stay explicit errors; they never load an example map silently. The **Retry background map** action remains available after a failed load.

**Estimated demo** retains its hypothetical aircraft, wind/current and oil inputs. It may read actual GEE terrain and historical land-cover context when the local/hosted API is configured, with no image-quality or forecast request in that context. It never saves inspections or commands hardware. File mode cannot fetch GEE and uses the explicit manual-reference alternative.

The background calculations cover drift compensation, camera/overlap/wind/battery planning, checked QGroundControl `.plan` export, and oil/capsule quantity estimates. Unknown hardware values remain required settings. DJI KMZ export and physical flight/release control are not enabled. See [method and limits](public/docs/planning-trial.md).

The fixed `XEDO Prototype 01` equipment candidates and project constants live in [`src/planning-hardware-profile.js`](src/planning-hardware-profile.js); [`src/planning-fixed-settings.js`](src/planning-fixed-settings.js) applies that policy to the planner. Camera geometry (candidate NoIR v2, 3.68 × 2.76 mm, 3.04 mm lens, 3280 × 2464 px), height 50 m, speed 5 m/s, overlap 70%/80% and minimum capture interval 1 s are locked. The project also locks windage 0.03 (0.025–0.04), extra drift margin 0 m, oil density 0.86 g/mL, capacity 3.42 g/g, material allowance 1.5, target fraction 1, QGC 5.1.0 and home-relative export height 50 m. Image search uses scene cloud cover ≤80% and starts with a 30-day date window; acquisition dates remain editable.

Fixed controls are hidden from routine mission entry, with their values available through the profile **Information** button in Mission settings. Every calculation/export reapplies the profile. A snapshot with missing fixed keys adopts this profile; explicitly different or null fixed values reject the import before the current mission changes. Synthetic test inputs use the same fixed constants. The generic calculation/API modules remain configurable for other callers. Locking these project assumptions does not verify the installed hardware.

### Inputs still needed

- **Each inspection:** boundary, dated satellite image, observation/arrival/search times; automatic regional wind/current data or independently reviewed manual vectors when drift is enabled.
- **Aircraft setup awaiting verification:** actual camera/lens/crop, firmware, motor and battery identity, wind/airspeed limits, reserve, loaded-flight power and takeoff/landing/turn allowances. Verified performance values can become another fixed profile later; unknown values remain blank.
- **Each flight:** launch/return coordinates, GEE model Home height or independently reviewed AMSL/reference, automatic or independently reviewed flight-level wind, usable starting energy, reviewed ceiling/corridor/no-go polygons and constraint source/validity. The schedule can be calculated automatically. Selecting a map coordinate records the point selection; surface-model readiness is labelled as a model assessment and airspace review is never preapproved.
- **Oil evidence:** independently reviewed pixels with image GSD, or measured oil area; supported thickness bounds; emulsion/oil fraction when applicable. Route distance, spacing, flight time, energy, sorties, oil volume and capsule mass remain calculated outputs.

## Requirements

- Node.js 24 and npm. The version is recorded in `.nvmrc`.
- Internet for the basemap and dependency installation. The embedded archived image and local calculations can work offline.

## Build the deployment draft

Run these commands from this directory, beside `package.json`:

```sh
npm ci
npm run check
npm test
npm run build
```

The frontend build is `dist/index.html`; a future Vercel deployment can build `api/gee.mjs`, `api/environment.mjs` and `api/planning-context.mjs` from source. Build-time credentials are unnecessary. Set `GEE_PROJECT_ID` and secret `GEE_SERVICE_ACCOUNT_JSON` in the server environment before deployment. Opening the HTML as a local file keeps offline archived mode. Do not upload `node_modules`, runtime data, private configuration, credential files or development logs.

To build the separately named local review file:

```sh
npm run build:file
```

The result is `output/standalone/XEDO-Planning-Trial.html`. A local HTML review does not require a server or port.

## Prepare GitHub and Vercel

Put this directory's **contents** at the repository root: `package.json`, `package-lock.json`, `vercel.json`, `.github/`, `src/`, `public/`, `scripts/`, and the other source directories must be included. Show hidden files when copying so `.github` is retained. The `.gitignore` excludes generated builds, dependencies, secrets, and runtime data; keep the example configuration files.

The package is prepared for upload, but preparing files does not push a repository or create a deployment. When you choose to connect your GitHub repository to Vercel, use:

| Setting | Value |
| --- | --- |
| Framework preset | Other |
| Root directory | Directory containing `package.json` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js version | 24.x |
| Runtime environment variables | `GEE_PROJECT_ID`, secret `GEE_SERVICE_ACCOUNT_JSON` |

`vercel.json` records the build settings. The root URL serves the planning page; `/planning` and `/planning.html` redirect to the root. The hosted imagery adapter exposes `/api/v1/gee/imagery/basemap`, `/search`, `/map` and `/tiles/...`; separate adapters expose `POST /api/v1/environment` and `POST /api/v1/gee/planning-context`. This deployment does not expose the retained database/device APIs or advanced dashboard. See [GEE imagery](docs/GEE-IMAGERY-TH.md) and [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json).

GitHub Actions runs verification on pushes and pull requests; it does not deploy. See [CI behavior](docs/CI.md) and the [Thai deployment guide](docs/DEPLOY-TH.md).

## Retained workspace — optional local development

The full workspace, Worker API, migration files, and Pi agent are retained for development. They are separate from the default static build.

```sh
npm run build:workspace
npm run dev:workspace
```

Build first. The local server then opens at `http://127.0.0.1:5173`, uses `dist-workspace/client` for assets, and stores SQLite/blob data under `data/` by default. `dev:workspace` reads an optional local `.env`; copy `.env.example` only if you need these server settings. Missing GEE/Pi credentials leave those connections unconfigured. Stop the server with Ctrl+C.

For private GEE credential-file setup and read-only Supabase diagnostics, see the [Thai connection guide](docs/CONNECTIONS-TH.md). Run `npm run connections:check` after configuration. This diagnostic does not migrate application data to Supabase.

**The bounded imagery, GEE planning-context and read-only environmental APIs have Vercel adapters in this source tree.** Publishing the full retained backend still requires a compatible runtime, persistent database/object storage, application access control and private secrets. Preserve the original private access boundary; the local development server is not a public deployment template. Do not enable aircraft or dispenser control from a planning preview.

See the [legacy workspace reference](docs/LEGACY-WORKSPACE.md) for historical architecture. Its former hosting URLs and commands describe that earlier deployment; use this README for this package's current build commands.

## Source map

| Area | Files |
| --- | --- |
| Three-step page and logo | `public/planning.html`, `public/assets/xedo-brand-mangrove.png` |
| UI styling and interactions | `src/planning-trial.css`, `src/planning-trial-client.js` |
| Information topics and dialogs | `src/planning-help-content.js`, `src/planning-help.js` |
| Four calculators | `src/trial-drift.js`, `src/trial-flight.js`, `src/trial-export.js`, `src/trial-oil.js` |
| Browser-only calculation adapter | `src/planning-file-api.js` |
| Static / standalone / workspace builds | `scripts/build.mjs`, `scripts/build-planning-file.mjs`, `scripts/build-workspace.mjs` |
| Retained server and persistence | `server.mjs`, `src/worker.js`, `scripts/local-storage.mjs`, `db/`, `drizzle/` |
| Automated checks | `tests/`, `.github/workflows/ci.yml` |

Automated tests validate software behavior. They do not validate native QGroundControl import, actual airspace permission, live GEE access, calibrated oil thickness, absorption performance, or physical hardware.

## Local automatic-condition trial

The same three-step planner can now retrieve NOAA GFS wind and Copernicus SMOC surface currents through the fixed Open-Meteo API adapter. Open **Mission settings → Mission conditions** for the planned takeoff/end window, Automatic/Manual mode, water setting, source timestamps and coverage. Each area/time change fetches up to five points; checks repeat at most every ten minutes while active. This version uses an equivalent spatial/time mean for the existing drift scenario and tests sampled wind vectors/gusts conservatively. The 50 m wind is explicitly interpolated between model levels at 10 m and 80 m.

To test live conditions on this computer:

```sh
npm run build
npm run preview:environment
```

Open http://127.0.0.1:5180. The server binds only to loopback. The read-only endpoint is `POST /api/v1/environment`; it accepts only a bounded Thailand-region polygon, start/end timestamps and flight height. GEE imagery still needs its separate server configuration; stored imagery remains an explicit option for its prepared Rayong crop. Run `npm run test:environment:live` in another terminal to check public-model responses at several example locations through this local endpoint.

Unknown/expired/masked values never become calm conditions. Current forecasts use a roughly 9 km regional grid, so **Estuary / mangrove channel** keeps automatic local drift unavailable. Use independently reviewed local data in Manual mode when appropriate. Automatic provenance and its expiry travel with calculation snapshots; expired data or an uncovered flight window blocks file export. Launch-point and airspace review remain explicit user actions. Surface readiness uses either the matching GEE model assessment or the separately reviewed manual reference. The standalone file retains calculators, archived imagery and Manual/test modes; automatic conditions require the HTTP API and are explicitly unavailable under `file://`.

Sources: [Open-Meteo weather](https://open-meteo.com/en/docs/gfs-api), [Marine API](https://open-meteo.com/en/docs/marine-weather-api), [model update metadata](https://open-meteo.com/en/docs/model-updates), [Copernicus SMOC](https://data.marine.copernicus.eu/product/GLOBAL_ANALYSISFORECAST_PHY_001_024/description). Direct authenticated Copernicus subsetting and GISTDA numerical radar ingestion are not connected in this trial. No aircraft or dispenser control is enabled.

## Estimated demo

Click **Estimated demo** in the planner to use the opt-in 177.6 Wh / 44.4 Wh reserve / 600 W assumed aircraft profile, test wind/airspeed limits of 8/12 m/s, and phase allowances of 30/30/5 seconds. It retains three mission steps and all four calculators. The stored dated image and browser calculations work without GEE or weather credentials. If the API is configured, demo mode may read actual static GEE terrain and historical land cover, labelled separately; it does not request automatic weather/current, selected-image quality or the GEE forecast reference. Missing terrain stays Unknown in automatic surface mode; use the separately reviewed manual-reference alternative when appropriate. The demo creates no saved inspections or device commands. The Information button explains the hypothetical battery and other assumptions.

**Use mission inputs** restores the previous form and boundary, with imagery and export review required again. This backup exists only in the current tab. Demo downloads are labelled and snapshots retain the profile provenance. Real hardware defaults and automatic-source behavior remain separate. See [planning trial details](public/docs/planning-trial.md#estimated-demo).

## Local GEE planning-data trial

The local three-step planner now requests read-only context from `POST /api/v1/gee/planning-context`. Open **GEE planning data** from the context bar or Mission settings. The endpoint computes bounded Copernicus DSM elevation samples, historical WorldCover water/mangrove area fractions, selected-image AOI cloud/valid coverage and a GFS 10 m takeoff-time reference. It does not replace the existing whole-mission Open-Meteo wind/current inputs or supply aircraft/battery specifications.

```sh
npm run build
npm run preview:geospatial
```

Open http://127.0.0.1:5182. This is a loopback-only preview. For real GEE reads, configure the existing ignored `.env` with `GEE_PROJECT_ID` and either private `GEE_SERVICE_ACCOUNT_FILE` or `GEE_SERVICE_ACCOUNT_JSON`; see `docs/CONNECTIONS-TH.md`. Credentials remain on the server. Missing configuration returns explicit Unknown values, not sample data. The standalone HTML keeps the same calculators and Manual/test modes; `file://` cannot call this API.

With that preview running, `npm run test:planning:live` checks a public coastal test polygon through the local HTTP APIs. It requires fresh, complete regional wind/current coverage and matching live GEE Home/route terrain plus WorldCover, and writes a bounded summary to `output/planning-live/results.json`. The optional GEE GFS point reference may remain unavailable when no forecast time falls inside the short test window; it does not replace whole-mission flight wind. This check does not validate aircraft performance, native QGC import or local channel currents.

The DSM is `COPERNICUS/DEM/GLO30_2024_1` (30 m, EGM2008). A Home elevation is offered only at the selected Home point. In **Automatic GEE model** surface mode, a fresh complete sample assessment can supply the labelled model Home height to an empty or previously model-owned field; it never overwrites an independently edited value or records human review. Alternatively, **Use reviewed estimate** copies the height only after an explicit source/reference review and retains that reviewed static provenance. Manual surface mode requires its own review. Changing Home revokes an unchanged copied estimate; manual edits are retained. Launch-point and airspace reviews still apply. This is not a surveyed launch altitude or terrain following. The 3D preview displays model samples while flight heights retain the existing flat-height illustration.

WorldCover is a 2021 classification at 10 m. Area fractions and unknown coverage are displayed; the route is not silently clipped or legally approved from these classes. AOI quality joins the selected Sentinel-2 image to cloud probability, with an explicit SCL fallback and 20 m analysis grid. Unknown pixels are not counted as clear, and source acquisition times are retained. GFS is a roughly 28 km, 10 m wind reference for one forecast time near takeoff; it cannot replace 50 m flight wind or establish whole-mission coverage.

Requests are limited to a Thailand-region simple polygon of at most 100 km², 120 vertices and 100 km extent, at most 80 elevation samples, and a mission window of at most 24 h. Parts fail independently. The context badge reports partial data if a requested sample is unknown/missing, a source is unavailable or mapped/image-quality coverage is below 99%; usable independent parts remain visible. A data-ready badge alone does not approve the surface comparison or export. Context requests are cancelled when the area, Home, selected image, mission times or route samples change, expire within ten minutes and retain source metadata in trial inputs/snapshots. **Refresh GEE data** explicitly retries the current context; a failed or expired response cannot keep old context ready. A static accepted Home estimate remains bound to its reviewed coordinate/value, while automatic model evidence must match the fresh context. No database write or aircraft/material-release command occurs.
