# XEDO · Coastal inspection draft

XEDO is an environmental innovation prototype for reviewing coastal satellite imagery and preparing a drone inspection plan. This package contains the latest three-step interface, the XEDO logo, Information dialogs, four planning calculators, and the retained workspace source.

The default deployment is a **static browser application**. It preserves the trial workflow and performs calculations in the browser. It does not deploy the retained API server or connect to live Google Earth Engine, a database, Raspberry Pi, an aircraft, or a capsule dispenser.

## Workflow

1. **Select an area:** draw and remove a polygon, or import trial geometry.
2. **Satellite survey:** review the stored Sentinel-2 image where its footprint covers the selected area. The archived image is not a live satellite feed or a confirmed oil detection.
3. **Drone deployment:** review the 2D/3D route, resolve required settings, and download a trial flight plan when its checks pass.

The background calculations cover drift compensation, camera/overlap/wind/battery planning, checked QGroundControl `.plan` export, and oil/capsule quantity estimates. Unknown hardware values remain required settings. DJI KMZ export and physical flight/release control are not enabled. See [method and limits](public/docs/planning-trial.md).

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

The deployable result is `dist/index.html`. No environment variables or credentials are needed for this static build. You can open this generated HTML file directly for local review. Do not upload `node_modules`, runtime data, private configuration, or development logs.

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
| Environment variables | None for the static draft |

`vercel.json` records the build settings. The root URL serves the draft; `/planning` and `/planning.html` redirect to the root. This static deployment does not expose `/api/*` or the retained advanced dashboard. Vercel settings are documented in [Configure a build](https://vercel.com/docs/builds/configure-a-build) and [vercel.json](https://vercel.com/docs/project-configuration/vercel-json).

GitHub Actions runs verification on pushes and pull requests; it does not deploy. See [CI behavior](docs/CI.md) and the [Thai deployment guide](docs/DEPLOY-TH.md).

## Retained workspace — optional local development

The full workspace, Worker API, migration files, and Pi agent are retained for development. They are separate from the default static build.

```sh
npm run build:workspace
npm run dev:workspace
```

Build first. The local server then opens at `http://127.0.0.1:5173`, uses `dist-workspace/client` for assets, and stores SQLite/blob data under `data/` by default. `dev:workspace` reads an optional local `.env`; copy `.env.example` only if you need these server settings. Missing GEE/Pi credentials leave those connections unconfigured. Stop the server with Ctrl+C.

**The retained backend is not configured for deployment to Vercel.** Before publishing it, implement a compatible server runtime, persistent database/object storage, application access control, and private secret configuration. Preserve the original private access boundary; the local development server is not a public deployment template. Do not enable aircraft or dispenser control from a planning preview.

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
