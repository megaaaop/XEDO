# XEDO Google Earth Engine connection indicator

The map header displays a Wi-Fi icon and HTTP round-trip time. Dashboard thresholds are green below 300 ms, yellow 300–999 ms, and red at 1,000 ms or above, or when a request fails. Grey with `— ms` means no valid reading is available. These are not Google SLA thresholds.

## Server configuration

| Environment value | Purpose |
|---|---|
| `GEE_PROJECT_ID` | Google Cloud project registered for Earth Engine, with the API enabled |
| `GEE_SERVICE_ACCOUNT_JSON` | Service account JSON stored only as a Sites secret |
| `GEE_PROBE_ASSET` | Optional; defaults to `projects/earthengine-public/assets/COPERNICUS/S2_SR_HARMONIZED` |

Account credentials are not configured yet. Set the Site environment values and publish a version when ready. The service account requires project access and asset-read permissions; follow the [Google service account guide](https://developers.google.com/earth-engine/guides/service_account).

Locally, `server.mjs` reads process environment values and does not automatically load `.env`. Never put service account JSON in source, HTML, browser storage, or published files.

## Measurement

1. The browser requests `GET /api/v1/gee/ping?nonce=<unique value>`.
2. The Worker exchanges an RS256-signed JWT for an access token and refreshes it near expiry. The token stays in server memory.
3. The Worker reads metadata using [Earth Engine assets.get](https://developers.google.com/earth-engine/reference/rest/v1/projects.assets/get) and `X-Goog-User-Project`. It does not create maps, read pixels, or analyse imagery.
4. The browser displays time from request dispatch through XEDO and GEE until the complete response is read. `upstream_ms` separately records Worker → GEE timing. The display includes Browser → XEDO → GEE → XEDO → Browser and may include initial authentication.

This is neither ICMP ping, tile loading time, imagery freshness, nor bandwidth. GEE imagery and map integration are subsequent work. Valid account configuration enables the connection indicator.

The shared sampler runs approximately every 30 seconds on an active, visible map page. All three map pages share it. When GEE is unconfigured, a website configuration check runs every 60 seconds without contacting GEE. Sampling stops on hidden tabs, non-map pages, and offline browsers. Readings are not stored in the database.

After configuration, each active tab makes approximately two metadata requests per minute, plus token exchanges when needed. These requests use the GEE API and quota. Clicking or panning does not trigger extra probes.

## API states

- `not_configured`: project or secret missing; upstream_ms is null. Website latency is not substituted.
- `connected`: valid asset response and numeric upstream_ms.
- `error`: permission, quota, timeout, network, or response failure. Previous readings are not shown as current connections.

The API uses `no-store` and returns the original nonce. Worker timeout is 6.5 seconds; browser timeout is 8 seconds. Error responses exclude private keys, tokens, and upstream error contents.

Automated tests validate JWT signing with an ephemeral key, mocked responses, token reuse, and failure states. They do not test a real GEE account.

Authentication reference: [Google OAuth 2.0 service accounts](https://developers.google.com/identity/protocols/oauth2/service-account).
