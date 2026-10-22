# XEDO API integration

XEDO has working server endpoints for saved inspections, route previews, device-data ingestion, images and processing results. Some connections require configuration; GEE imagery, AI inference and physical flight/release control still require implementation. Adding an API key does not enable those missing integrations.

## Integration boundaries

| Connection | Implemented | Required before real use |
|---|---|---|
| Satellite imagery | Earth Search catalogue, stored original imagery and COG display | Internet access and a readable scene covering the selected polygon; this source is separate from GEE |
| GEE connection indicator | Server-side authentication and metadata probe | Registered Cloud project, enabled Earth Engine API, permitted service account and server secrets |
| GEE planning context | Bounded historical SRTM elevation/JRC water sampling for the same 2D/3D route | All of the above plus computation permissions and a real-account integration test |
| Pi data | Authenticated telemetry batches, original image upload, processing-result ingestion, offline queue and read-only doctor | Matching device/Site credentials, network access, and physical Pi/sensor/camera acceptance |
| AI | Storage and display of externally supplied processing results | Model, inference adapter, evaluated outputs and source-image linkage; no built-in oil-detection inference |
| Aircraft and dispenser | Planning previews and data display | Aircraft-specific command adapter, acknowledgements, operating-state handling and physical acceptance; no flight or release commands are implemented |

## Access and credentials

The hosted Site has its own access boundary. Use the existing sharing/access configuration. For a permitted headless client, the owner supplies its Site service token in `OAI-Sites-Authorization: Bearer <SITE_TOKEN>`. This is separate from device authorization. It is not a GEE credential and must never be embedded in browser source or public downloads.

Live Pi ingestion and its auth check also require `X-XEDO-Device-Token: <DEVICE_TOKEN>`, matching `XEDO_PI_TOKEN` and the configured `XEDO_PI_DEVICE_ID` on the server. A device token alone does not bypass Site access. Tokens must stay in private configuration. The browser uses its existing same-origin Site session and needs no Google secret.

The API accepts same-origin website writes and permitted server/device clients. It does not offer a general cross-origin browser API; another website cannot bypass this by adding a token. Treat redirects or sign-in HTML as failed API access, rather than successful JSON responses.

## GEE setup and acceptance

Set `GEE_PROJECT_ID` and secret `GEE_SERVICE_ACCOUNT_JSON` in Sites runtime configuration, then publish a saved version to apply the environment revision. Local `server.mjs` reads process environment variables; it does not automatically read `.env` files. `GEE_PROBE_ASSET` is optional.

Register the Cloud project for Earth Engine and enable the API. Grant the service account the necessary project/asset access, computation permission and, where required, permission to consume the project. Follow [Google's service-account guide](https://developers.google.com/earth-engine/guides/service_account). Metadata access alone does not prove that planning computations are permitted.

1. Call `GET /api/v1/gee/ping?nonce=<unique-value>`. Require the echoed nonce, `service: "gee"`, `state: "connected"` and numeric `upstream_ms`. An HTTP 200 with `not_configured` or `error` is not a successful GEE connection.
2. Open a saved Quick mission survey and generate a preview with `useGEE: true`. Require `context.state: "connected"`. Inspect the datasets, sample count and null values; a successful geometric plan can coexist with unavailable GEE data.
3. Verify the same target/route in 2D and 3D. Missing elevation stays unknown. SRTM and JRC are historical datasets, not current obstacles, bathymetry or live oil observations.

The Wi-Fi value is HTTP round-trip latency through XEDO to GEE, not imagery loading speed or an ICMP ping. See [connection measurement](gee-connection-en.md) and [planning context](gee-planning.md) for request limits and source dates. GEE map tiles and imagery selection remain separate future work.

## Deployment preview contract

From the authenticated Site page:

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

Install the [Pi 5 kit](pi5-setup.md), then run:

```bash
sudo python3 /opt/xedo-pi/run_agent.py --config /etc/xedo-pi.env doctor
```

The doctor makes only `GET /api/v1/health` and `GET /api/v1/devices/{device_id}/auth-check`. Require `api_reachable: true` and `device_authenticated: true`. `hardware_tested: false` is expected: no sensor, camera, aircraft or dispenser is exercised by this check.

Normal ingestion uses `POST /api/v1/telemetry/batches`, multipart `POST /api/v1/captures` with metadata and an original image, and JSON `POST /api/v1/image-processing-results`. See the [Pi image guide](pi-agent-en.md) and [field contracts](../contracts/openapi.json). An externally computed bounding box is in image pixels; it is not automatically converted to a geographic oil boundary. Completed processing requires known image dimensions and boxes inside those dimensions.

Use stable unique event/capture/result IDs. Retry the same ID only for the same data, and retain rejected packets for diagnosis. Keep live, simulated and replay data distinct. A successful heartbeat proves delivery, not sensor accuracy, GPS freshness or physical operation.

## Before declaring an integration ready

Require the appropriate real-service response, visible data in XEDO, and a controlled recovery check for timeout, invalid credentials and duplicate submissions. Automated fixtures cover software behavior; they do not validate an unconfigured Google account or physical equipment. Do not enable flight/release controls on the basis of a successful metadata probe or planning preview.
