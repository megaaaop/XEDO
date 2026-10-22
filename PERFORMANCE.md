# Latency improvements

The satellite workspace now loads its map and archived preview first. Planning,
monitoring, reports and settings load the operations module when first opened;
GeoTIFF/WebGL decoding loads when a COG image is selected. Planning and monitoring
maps are created on demand. Replay keeps the route and camera in place and updates
the device point instead of rebuilding and fitting the route every frame.

Initial data uses `/api/state?scope=satellite`: areas, incidents, observations and
referenced scenes. Other pages fetch the complete state. Records are not cached in
memory or on the CDN. Successful bootstrap is reused per database binding, with
retry after failure. Catalogue scenes and initial operations records use batched
writes. Image range responses no longer wait for an R2 cache write to finish.

The build emits content-hashed ES modules and CSS. Those assets use a one-year
immutable cache; HTML and API state keep their existing freshness behavior.
`Server-Timing: workspace` measures state preparation, and Performance entries
`xedo:workspace-ready` / `xedo:scene-ready` support browser diagnosis. They do not
measure latency to Google Earth Engine or a future Supabase service.

## Local comparison

Measured for the initial latency update (version 19).

Two cold browser contexts per condition, 1440 × 960 headless Chrome, the same
isolated SQLite database and uncompressed static server. External map tiles,
fonts and thumbnails were blocked in both versions. Results below are averages,
not measurements of production hosting or Supabase/Vercel.

| Condition | Workspace ready before → after | Image ready before → after |
| --- | --- | --- |
| Local | 1.47 s → 0.31 s | 1.85 s → 0.61 s |
| CPU slowed 4× | 2.18 s → 1.35 s | 2.68 s → 1.79 s |
| 1.6 Mbps, 150 ms simulated latency | 9.56 s → 5.90 s | 13.52 s → 9.75 s |

All initial JavaScript, including shared chunks, fell from 1,223,338 bytes to
574,327 bytes (53% less). Its combined gzip size fell from 406,629 to 176,071
bytes (57% less). Deferred files still download when their features are used.

Validation covers scoped state, complete history, fresh records and user identity,
bootstrap failure recovery, the existing data/backup workflow, planning and
simulation. Browser checks cover lazy maps, survey-to-plan navigation, playback,
seeking, background polling, reports, direct links and a generated georeferenced
RGB TIFF served through byte ranges. Fixtures remain local and are not deployed.

Before/after measurements and browser checks are saved under
`output/performance/` in the working checkout. Production network round trips,
upstream imagery access and hardware speed still affect real user latency.

## Follow-up correctness review

Controlled delayed responses reproduced old catalogue results after an area change,
Replay/simulation responses overwriting Live mode, a stale Live failure overwriting
Replay, and old report results/errors overwriting newer filters or refreshes.
Requests now have ownership checks and superseded reads are aborted. Mutations
still finish saving; their display continuation is skipped when the user has made
a newer selection. Switching monitor modes resets the GPS marker so the first live
position can center the map. Failed deferred modules have a working Reload page
button, and a late successful state request cannot hide that error.

`tests/browser-races.cjs` checks 11 controlled browser scenarios using an isolated
database under `output/race-audit/`. It requires Playwright; use
`XEDO_PLAYWRIGHT_MODULE` for an existing installed module and `XEDO_CHROME_PATH`
for a Chrome executable when not using Playwright's bundled browser. Run
`node tests/browser-races.cjs` after building. Tests do not contact production or
mutate production data. The normal API/data tests still run through `npm test`.
