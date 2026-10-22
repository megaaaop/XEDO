# Package and GEE integration verification — 23 October 2026

The initial package baseline below was verified in a separate clean checkout with Node 24.11.1 and npm 11.6.2. The later GEE integration checks are recorded separately below.

| Command | Result |
| --- | --- |
| npm ci --no-audit --no-fund | Completed: 43 locked packages installed |
| npm run check | Passed |
| npm test | 99 tests passed, 0 failed, 0 skipped |
| npm run build | Passed: static dist/index.html |
| npm run build:file | Passed: standalone local HTML |
| npm run build:workspace | Passed: retained client, Worker and migrations |

The initial offline install lacked a cached package; the subsequent online locked install completed. Existing development dependencies emitted deprecation warnings. API error messages in negative tests were expected, not test failures.

Final artifact checks: inline scripts parse, unique IDs, three workflow steps, four calculation sections, English UI, embedded new logo/favicon/satellite image. Required GitHub files and CI npm commands are present. No private environment, database, credentials, dependencies, generated files or old hosting project identity is included. Source was scanned for common credential patterns; this bounded scan cannot detect every possible secret format.

## Fixes made

- Added the missing build:workspace command used by CI.
- Added explicit standalone mode for HTTPS. Actual calculation dispatch is tested with zero fetch calls; full workspace retains its server adapter.
- Separated static and workspace outputs and corrected the local server asset path.
- Added Node version, example environment, ignore rules, CI and deployment documentation.
- Preserved the four calculation engines, GEE planning module and mission geometry.

## GEE imagery integration verification

Verified in the current integration workspace, using the existing Google Cloud project and service account. No credential content is included in these results.

- `npm run check` and all **142 tests** passed.
- Hosted, portable-file and full-workspace builds passed.
- The hosted API bridge searched real Sentinel-2 acquisitions, returned 11 covering scenes for the sample boundary, and rendered the 19 October 2026 03:54 UTC Sentinel-2A acquisition (24.6% whole-scene cloud, 10 m source resolution).
- The existing account denied map creation; the bounded `image:computePixels` fallback successfully returned actual PNG pixels using its existing computation permission.
- Browser testing confirmed visible imagery, acquisition/source labels, progression to mission preparation, readiness revoked on scene changes, and no horizontal overflow at 390 px. No JavaScript console errors or warnings occurred.
- A separately imported coastal polygon at Pattaya returned 12 covering acquisitions and displayed real beach, city and sea pixels from the same verified Sentinel-2A acquisition.
- A transparent-PNG interception test produced the visible no-data error and kept Prepare disabled; removing the interception and reloading the real acquisition restored readiness.
- Hosted functions expose only imagery search/map/tile routes. Unit tests cover validation, origin/method/body limits, session tampering/expiry/cold starts, AOI bounds, sanitized errors and preserved PNG responses. Frontend builds were checked for private credential material.

## Vercel deployment verification

- CLI 65.1.0 authenticated successfully to the existing `xedo` project, `prj_x35WcipWxA767cYwv3f0CXcdyea3`, in team `megaroblox350-4750s-projects`.
- Set `GEE_PROJECT_ID` as config and `GEE_SERVICE_ACCOUNT_JSON` as a server secret for Preview and Production. Source upload dry-run contained 178 actual files and no environment, credential or local-data files.
- Preview `dpl_BQkQ4JgVfwK72n4VY9x5MWfxtoEM` passed real search/map/PNG checks. Its protected browser flow loaded coastal imagery, enabled Prepare and reached step 3; search/map/all 15 tile requests returned HTTP 200 with zero browser console errors. Development OIDC stayed in memory and was injected only for the exact Preview origin.
- Production `dpl_DbdcFZwQLSfwKFijssz3pLBESJuC` passed the same HTTP chain before promotion. Promoted this deployment to the existing project; `https://xedo-eight.vercel.app` then passed page/search/map/tile checks with HTTP 200, 12 covering scenes and a real 256x256 PNG (42,442 bytes).
- Verified source: Sentinel-2A acquisition 19 October 2026 03:54 UTC, 24.58479% whole-scene cloud, 10 m natural-colour RGB; rendering used the existing computation permission through `computePixels`.
- Existing deployment protection settings were preserved. The main `xedo-eight.vercel.app` domain returned HTTP 200 without authentication at verification time.
- Main-domain browser verification also displayed the real coastal image and reached step 3. One initial tile returned a transient 503; the UI correctly blocked readiness and offered retry. Reloading the selected acquisition recovered successfully with map/all 15 tiles returning 200 and Prepare enabled.

## Limits

The Vercel deployment above was built directly from the local integration source before its GitHub commit, so its deployment commit metadata refers to the earlier baseline. GitHub publication and CI results are tracked in repository history and workflow runs. The connector's separate environment-variable access restriction was handled by using the authenticated CLI. Portable-file browser focus behavior, live Pi/aircraft, native QGC import and airspace acceptance remain unverified. Hosted output uses a static planner with a limited GEE function. Full database, device and flight-control backend deployment needs separate authenticated runtime and storage integration.
