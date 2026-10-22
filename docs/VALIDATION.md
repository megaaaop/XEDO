# Final package verification — 23 October 2026

Verified in a separate clean checkout with Node 24.11.1 and npm 11.6.2.

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

## Limits

Nothing was pushed or deployed. GitHub Actions and Vercel have not run remotely. Browser visual/native focus behavior was not rechecked because file URL automation is blocked. Live GEE/Pi/aircraft, native QGC import and airspace acceptance are not verified. Default output is the static trial; full backend deployment needs separate authenticated runtime and storage integration.
