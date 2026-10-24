# XEDO · Coastal inspection draft

XEDO is an environmental innovation prototype for reviewing coastal satellite imagery and preparing a drone inspection plan. This package contains the latest three-step interface, the XEDO logo, Information dialogs, four planning calculators, and the retained workspace source.

The default deployment combines a **static browser application** with a bounded **Google Earth Engine imagery API** on Vercel. A real Sentinel-2 mosaic loads as the background on opening, before an inspection polygon is drawn. Its source date range is displayed. The separate area-review step loads one covering acquisition with its exact timestamp. Google credentials never enter the browser. Planning calculations still run in the browser. The retained database, Pi, aircraft and dispenser APIs remain separate from this deployment.

## Workflow

1. **Select an area:** draw and remove a polygon, or import trial geometry.
2. **Satellite survey:** search GEE by acquisition dates and scene cloud cover, choose a fully covering Sentinel-2 image, and load it for review. The image's acquisition time is displayed. Archived imagery is available only by explicit selection. Neither source confirms oil detection.
3. **Drone deployment:** review the 2D/3D route, resolve required settings, and download a trial flight plan when its checks pass.

The background calculations cover drift compensation, camera/overlap/wind/battery planning, checked QGroundControl `.plan` export, and oil/capsule quantity estimates. Unknown hardware values remain required settings. DJI KMZ export and physical flight/release control are not enabled. See [method and limits](public/docs/planning-trial.md).

The fixed `XEDO Prototype 01` equipment candidates and project constants live in [`src/planning-hardware-profile.js`](src/planning-hardware-profile.js); [`src/planning-fixed-settings.js`](src/planning-fixed-settings.js) applies that policy to the planner. Camera geometry (candidate NoIR v2, 3.68 × 2.76 mm, 3.04 mm lens, 3280 × 2464 px), height 50 m, speed 5 m/s, overlap 70%/80% and minimum capture interval 1 s are locked. The project also locks windage 0.03 (0.025–0.04), extra drift margin 0 m, oil density 0.86 g/mL, capacity 3.42 g/g, material allowance 1.5, target fraction 1, QGC 5.1.0 and home-relative export height 50 m. Image search uses scene cloud cover ≤80% and starts with a 30-day date window; acquisition dates remain editable.

Fixed controls are hidden from routine mission entry, with their values available through the profile **Information** button in Mission settings. Every calculation/export reapplies the profile. A snapshot with missing fixed keys adopts this profile; explicitly different or null fixed values reject the import before the current mission changes. Synthetic test inputs use the same fixed constants. The generic calculation/API modules remain configurable for other callers. Locking these project assumptions does not verify the installed hardware.

### Inputs still needed

- **Each inspection:** boundary, dated satellite image, observation/arrival/search times; automatic regional wind/current data or independently reviewed manual vectors when drift is enabled.
- **Aircraft setup awaiting verification:** actual camera/lens/crop, firmware, motor and battery identity, wind/airspeed limits, reserve, loaded-flight power and takeoff/landing/turn allowances. Verified performance values can become another fixed profile later; unknown values remain blank.
- **Each flight:** real home coordinates and AMSL altitude, automatic or independently reviewed flight-level wind, usable starting energy, scheduled times, reviewed ceiling/corridor/no-go polygons and constraint source/validity. The three manual export confirmations are never preapproved.
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

The frontend build is `dist/index.html`; A future Vercel deployment can build `api/gee.mjs` and `api/environment.mjs` from source. Build-time credentials are unnecessary. Set `GEE_PROJECT_ID` and secret `GEE_SERVICE_ACCOUNT_JSON` in the server environment before deployment. Opening the HTML as a local file keeps offline archived mode. Do not upload `node_modules`, runtime data, private configuration, credential files or development logs.

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

`vercel.json` records the build settings. The root URL serves the planning page; `/planning` and `/planning.html` redirect to the root. Only `/api/v1/gee/imagery/basemap`, `/search`, `/map` and `/tiles/...` are exposed by the hosted imagery adapter. It does not expose the retained database/device APIs or advanced dashboard. See [GEE imagery](docs/GEE-IMAGERY-TH.md) and [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json).

GitHub Actions runs verification on pushes and pull requests; it does not deploy. See [CI behavior](docs/CI.md) and the [Thai deployment guide](docs/DEPLOY-TH.md).

## Retained workspace — optional local development

The full workspace, Worker API, migration files, and Pi agent are retained for development. They are separate from the default static build.

```sh
npm run build:workspace
npm run dev:workspace
```

Build first. The local server then opens at `http://127.0.0.1:5173`, uses `dist-workspace/client` for assets, and stores SQLite/blob data under `data/` by default. `dev:workspace` reads an optional local `.env`; copy `.env.example` only if you need these server settings. Missing GEE/Pi credentials leave those connections unconfigured. Stop the server with Ctrl+C.

For private GEE credential-file setup and read-only Supabase diagnostics, see the [Thai connection guide](docs/CONNECTIONS-TH.md). Run `npm run connections:check` after configuration. This diagnostic does not migrate application data to Supabase.

**The bounded imagery and read-only environmental APIs have Vercel adapters in this source tree.** Publishing the full retained backend still requires a compatible runtime, persistent database/object storage, application access control and private secrets. Preserve the original private access boundary; the local development server is not a public deployment template. Do not enable aircraft or dispenser control from a planning preview.

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

Unknown/expired/masked values never become calm conditions. Current forecasts use a roughly 9 km regional grid, so **Estuary / mangrove channel** keeps automatic local drift unavailable. Use independently reviewed local data in Manual mode when appropriate. Automatic provenance and its expiry travel with calculation snapshots; expired data or an uncovered flight window blocks file export. Manual home/surface/airspace confirmations remain mandatory. The standalone file retains calculators, archived imagery and Manual/test modes; automatic conditions require the HTTP API and are explicitly unavailable under `file://`.

Sources: [Open-Meteo weather](https://open-meteo.com/en/docs/gfs-api), [Marine API](https://open-meteo.com/en/docs/marine-weather-api), [model update metadata](https://open-meteo.com/en/docs/model-updates), [Copernicus SMOC](https://data.marine.copernicus.eu/product/GLOBAL_ANALYSISFORECAST_PHY_001_024/description). Direct authenticated Copernicus subsetting and GISTDA numerical radar ingestion are not connected in this trial. No aircraft or dispenser control is enabled.
