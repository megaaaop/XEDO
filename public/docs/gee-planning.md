# GEE context for the deployment preview

The deployment screen generates one preview when the operator chooses **Generate**. `POST /api/v1/deployment-preview` accepts `{surveyId, altitudeM, spacingM, speedMps, useGEE}`; `useGEE` defaults to true. The server reads the original Quick mission observation from the survey's immutable boundary snapshot. Editing the current observation does not change this preview's target. The endpoint writes no records and sends no aircraft or dispenser commands.

The same geometric plan powers the 2D and 3D views. GEE adds optional historical terrain and surface-water context. A missing configuration or an upstream error still returns a geometric preview with unknown elevation. `useGEE:false` explicitly generates a local preview without contacting Google. A blocked geometric plan makes no GEE request.

## Account setup

Use the existing server configuration: `GEE_PROJECT_ID` and secret `GEE_SERVICE_ACCOUNT_JSON`. Do not put service-account credentials in HTML, browser storage, source control, or requests from the browser. No new credentials or environment values are introduced. Register the Cloud project for Earth Engine and enable its API. The service account needs access to the datasets, permission to consume the project, and `earthengine.computations.create`; an account that can read metadata for the connection indicator may still lack computation permission. Follow the [official service-account guide](https://developers.google.com/earth-engine/guides/service_account).

The server reuses the existing signed-JWT OAuth flow and its `earthengine.readonly` scope, which the [value:compute REST endpoint](https://developers.google.com/earth-engine/reference/rest/v1/projects.value/compute) accepts. Tokens stay in server memory. Upstream error contents, keys, and tokens are excluded from responses.

## Data and limits

- [NASA/USGS SRTM elevation](https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003), `USGS/SRTMGL1_003`, provides approximately 30 m elevation in metres from February 2000. Coverage is near-global, approximately 56°S to 60°N. It does not describe current obstacles or bathymetry. Attribution: NASA / USGS / JPL-Caltech.
- [JRC Global Surface Water v1.4](https://developers.google.com/earth-engine/datasets/catalog/JRC_GSW1_4_GlobalSurfaceWater), `JRC/GSW1_4/GlobalSurfaceWater`, provides 30 m historical water occurrence percentages for 1984–2021. Areas with no detected water can be masked. Null values are kept as unknown rather than converted to zero, land, or ocean. Attribution: EC JRC/Google; Pekel et al., Nature 540, 418–422 (2016), [doi:10.1038/nature20584](https://doi.org/10.1038/nature20584).

Each user action requests at most one fixed `value:compute` expression. It samples at most 55 route positions and 25 ground-grid positions clipped to the selected polygon, with duplicates removed. The server uses [`Image.reduceRegions`](https://developers.google.com/earth-engine/apidocs/ee-image-reduceregions) with point features, a first-value reducer, 30 m scale, and at most four pixels per point. It requests no image export, map tiles, or full-area raster. Up to two computations may run concurrently in one Worker instance; requests time out after 10 seconds and are not automatically retried. Results are cached in server memory for 10 minutes, up to 16 point sets, keyed by the actual sample points, project, and a credential fingerprint. There are no periodic planning requests or database caches. These requests still consume Earth Engine quota.

Responses distinguish `connected`, `not_configured`, `disabled`, and `error`. Every sample has longitude, latitude, `elevationM`, and `waterOccurrencePct`; missing values stay null. `sampledAt` identifies the request time, not the historical acquisition date. Only waypoints matching an actual terrain sample receive an estimated MSL altitude; the remaining 3D heights use a relative diagram reference. Sparse samples do not establish clearance, classify current water conditions, identify oil, or make a flight plan operational.

Automated tests use ephemeral signing keys, mocked Google responses, and a local database. They test authentication, masks, caching, limits, error sanitization, and frozen snapshots. A real configured GEE account still requires integration validation before claiming live account access.
