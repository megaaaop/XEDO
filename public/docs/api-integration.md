# XEDO API integration

The default XEDO deployment combines a static frontend with a limited Vercel GEE imagery function (`api/gee.mjs`). It searches actual Sentinel-2 acquisitions and displays RGB tiles; planning calculations run in the browser without persisting surveys. The retained workspace has separate server endpoints for saved inspections, route previews, device-data ingestion, images and processing results. That full backend is not deployed by the default Vercel build. AI inference and physical flight/release control still require implementation.

## Integration boundaries

| Connection | Implemented | Required before real use |
|---|---|---|
| GEE satellite imagery | Bounded Sentinel-2 search, scene review and same-origin RGB tiles in hosted and workspace modes | Registered Cloud project, enabled Earth Engine API, permitted service account, server secrets and an image covering the selected polygon |
| Other satellite sources | Earth Search catalogue, stored original imagery and COG display in the retained workspace; explicitly selected archived preview in the planning interface | Source availability and boundary coverage; the offline file uses archived imagery only |
| GEE connection indicator | Server-side authentication and metadata probe in the retained workspace | Registered Cloud project, enabled Earth Engine API, permitted service account and server secrets; not a default hosted API |
| GEE planning context | Bounded historical SRTM elevation/JRC water sampling for the same 2D/3D route in the retained workspace | All of the above plus computation permissions and a real-account integration test; not exposed by the hosted imagery adapter |
| Pi data | Retained workspace: authenticated telemetry batches, original image upload, processing-result ingestion, offline queue and read-only doctor | Separate backend deployment, matching device/Site credentials, network access, and physical Pi/sensor/camera acceptance |
| AI | Retained workspace: storage and display of externally supplied processing results | Separate backend deployment, model, inference adapter, evaluated outputs and source-image linkage; no built-in oil-detection inference |
| Aircraft and dispenser | Planning previews and data display | Aircraft-specific command adapter, acknowledgements, operating-state handling and physical acceptance; no flight or release commands are implemented |

## Access and credentials

The default Vercel imagery gateway is a bounded, read-only satellite API. It accepts same-origin browser requests and does not need browser Google credentials, a Pi token or a database key. It exposes only the GEE background mosaic, imagery search, map sessions and tiles; it does not expose the retained workspace APIs. Requests from other website origins are rejected. Server-side Google secrets never enter HTML, browser requests or downloaded files.

The retained workspace and any earlier private Sites deployment have a separate access boundary. Preserve their sharing/access configuration. Where a private Site requires it, a permitted headless client uses `OAI-Sites-Authorization: Bearer <SITE_TOKEN>`. This token is separate from device authorization and GEE credentials, and must never be embedded in browser source or public downloads.

Live Pi ingestion and its auth check on a separately deployed workspace also require `X-XEDO-Device-Token: <DEVICE_TOKEN>`, matching `XEDO_PI_TOKEN` and the configured `XEDO_PI_DEVICE_ID` on that server. A device token alone does not bypass private Site access. Tokens must stay in private configuration.

Retained workspace write endpoints accept same-origin website requests and permitted server/device clients. They do not offer a general cross-origin browser API; another website cannot bypass this by adding a token. Treat redirects or sign-in HTML as failed API access, rather than successful JSON responses.

## GEE setup and acceptance

Set `GEE_PROJECT_ID` and secret `GEE_SERVICE_ACCOUNT_JSON` in the Vercel server environment, then create a new deployment to apply them. Do not use public environment-variable prefixes or upload local credential files. For local workspace use, `npm run dev:workspace` reads an optional `.env`; `GEE_SERVICE_ACCOUNT_FILE` may point to a private Service Account JSON file. The hosted adapter accepts only project ID and credential JSON from runtime configuration, with no local credential-file dependency. `GEE_PROBE_ASSET` is optional for the retained workspace metadata probe.

Register the Cloud project for Earth Engine and enable the API. Grant the service account the necessary project/asset access, computation permission and, where required, permission to consume the project. Follow [Google's service-account guide](https://developers.google.com/earth-engine/guides/service_account). Metadata access alone does not prove that imagery or planning computations are permitted.

1. Open a fresh hosted page with no inspection polygon. Require visible GEE background pixels, actual acquisition range and source count. Draw over the background; navigating it must not create or modify an inspection polygon. In the satellite-survey step, select a polygon, acquisition-date range and cloud threshold. Search and require actual Sentinel-2 results covering the complete boundary. A failed request or empty result must not substitute an OSM or archived example image automatically.
2. Select a scene, load it, and require visible RGB tiles, an acquisition timestamp and scene cloud metadata before preparing the drone mission. Changing the area/source or expiring the tile session requires image review again.
3. If testing the separate workspace metadata probe, call `GET /api/v1/gee/ping?nonce=<unique-value>`. Require the echoed nonce, `service: "gee"`, `state: "connected"` and numeric `upstream_ms`. An HTTP 200 with `not_configured` or `error` is not a successful GEE connection. This route is not exposed by the default Vercel adapter.
4. For the workspace historical planning context, open a saved Quick mission survey and generate a preview with `useGEE: true`. Require `context.state: "connected"`, then inspect datasets, sample counts and nulls in the same 2D/3D target/route. Missing elevation stays unknown. SRTM and JRC are historical datasets, not current obstacles, bathymetry or live oil observations.

The workspace Wi-Fi value is HTTP round-trip latency through XEDO to GEE, not imagery loading speed or an ICMP ping. See [connection measurement](gee-connection-en.md) and [planning context](gee-planning.md) for request limits and source dates.

## Hosted imagery contract

| Route | Input / output |
|---|---|
| `POST /api/v1/gee/imagery/basemap` | JSON `{geometry}` → fixed recent-30-day Sentinel-2 mosaic, actual acquisition range/count, display geometry and expiring same-origin tile session |
| `POST /api/v1/gee/imagery/search` | JSON `{geometry,start,end,maxCloud}` → fully covering scene metadata |
| `POST /api/v1/gee/imagery/map` | JSON `{sceneId,geometry}` → rechecked scene, geometry, expiring session and same-origin tile URL |
| `GET /api/v1/gee/imagery/tiles/{sessionId}/{z}/{x}/{y}` | PNG RGB tiles at zoom 0–18 |

The fixed source is `COPERNICUS/S2_SR_HARMONIZED`, RGB bands B4/B3/B2 with 10 m source resolution. The background uses up to 31 intersecting acquisitions within a server-fixed recent 30-day UTC window and 80% whole-scene cloud limit, mosaicked with newer imagery on top. Its display rectangle is bounded to 100 km per axis; the client uses a padded viewport within 90 km and constrains zoom to that limit. Background sessions never persist a selected scene or grant mission readiness. Area-review searches span at most 90 days, returning at most 12 fully covering scenes. Dates are acquisition dates, and cloud cover describes the whole scene. These images do not confirm oil or provide a live video feed.

JSON request bodies are limited to 64 KiB. The gateway rejects other routes, unsupported methods, cross-origin browser requests and arbitrary asset URLs or Earth Engine expressions. Google access tokens stay server-side. Tile sessions expire after 30 minutes and work across function cold starts. Hosted calculations and downloaded snapshots do not create database records.

## Deployment preview contract

This retained-workspace endpoint is not deployed by the default Vercel build. From an authenticated workspace/Site page:

```js
const response = await fetch('/api/v1/deployment-preview', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  credentials: 'same-origin',
  body: JSON.stringify({
    surveyId: 'SUR_REPLACE_WITH_SAVED_QUICK_SURVEY',
    altitudeM: 50,
    spacingM: 100,
    speedMps: 5,
    useGEE: true
  })
});
if (!response.ok) throw new Error('Preview request failed: ' + response.status);
const preview = await response.json();
if (preview.plan.status !== 'generated') throw new Error(preview.plan.reason);
// Inspect preview.context.state separately before using GEE samples.
```

The endpoint reads the original Quick mission boundary snapshot. It accepts a saved `surveyId`, not a replacement geometry. It returns `schema_version: "xedo-deployment-preview/1"` and `hardwareControl: false`, and writes no records or device commands. `useGEE: false` generates a local preview without contacting Google.

This preview is distinct from a persisted MissionPlan 1.0. Do not pass its survey ID as a Pi `mission_id`, import it as a legacy MissionPlan, or treat its JSON export as an aircraft command. The operational planner and any future aircraft adapter have separate validation requirements.

## Pi and external processing

These routes require a separately configured workspace backend; they are not available through `api/gee.mjs`. Install the [Pi 5 kit](pi5-setup.md), then run:

```bash
sudo python3 /opt/xedo-pi/run_agent.py --config /etc/xedo-pi.env doctor
```

The doctor makes only `GET /api/v1/health` and `GET /api/v1/devices/{device_id}/auth-check`. Require `api_reachable: true` and `device_authenticated: true`. `hardware_tested: false` is expected: no sensor, camera, aircraft or dispenser is exercised by this check.

Normal ingestion uses `POST /api/v1/telemetry/batches`, multipart `POST /api/v1/captures` with metadata and an original image, and JSON `POST /api/v1/image-processing-results`. See the [Pi image guide](pi-agent-en.md) and [field contracts](../contracts/openapi.json). An externally computed bounding box is in image pixels; it is not automatically converted to a geographic oil boundary. Completed processing requires known image dimensions and boxes inside those dimensions.

Use stable unique event/capture/result IDs. Retry the same ID only for the same data, and retain rejected packets for diagnosis. Keep live, simulated and replay data distinct. A successful heartbeat proves delivery, not sensor accuracy, GPS freshness or physical operation.

## Before declaring an integration ready

Require the appropriate real-service response, visible data in XEDO, and a controlled recovery check for timeout, invalid credentials and duplicate submissions. Automated fixtures cover software behavior; they do not validate an unconfigured Google account or physical equipment. Do not enable flight/release controls on the basis of a successful metadata probe or planning preview.
