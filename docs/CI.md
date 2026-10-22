# Continuous integration

The **Verify XEDO** GitHub Actions workflow runs on pushes to every branch, pull requests, and manual runs from the Actions tab. It checks source code and build outputs. It does not deploy, publish, or send commands to an aircraft.

The workflow uses Ubuntu and Node.js 24 with a 10-minute job limit. The checkout and Node setup actions are pinned to reviewed commit IDs. Repository permissions are read-only, and checkout does not retain Git credentials. No repository secrets, GEE credentials, Pi tokens, or deployment tokens are required.

## Checks

| Command | What it verifies |
| --- | --- |
| `npm ci` | Installs the dependency versions recorded in `package-lock.json`. |
| `npm run check` | Checks the configured JavaScript source and build scripts for syntax errors. |
| `npm test` | Runs the project's automated calculation, validation, and integration tests. |
| `npm run build` | Builds the static deployment draft into `dist/`. |
| `npm run build:workspace` | Checks that the retained workspace and Worker source can still build into `dist-workspace/`. This does not provision a backend. |
| `npm run build:file` | Builds the standalone HTML file for local review. |

All listed steps must pass. The workspace build is an additional compatibility check for the retained source; Vercel's static deployment uses the default `npm run build` output, not `dist-workspace/`.

## What a green run means

A green run means these automated tests and builds passed for the selected commit. It does not replace visual review in a browser, native QGroundControl or flight-simulator validation, a live GEE connection test, airspace review, or Raspberry Pi and aircraft hardware testing. Static trial data and local calculations remain trial features even after CI passes.

To repeat the same checks locally, use Node.js 24 and run the commands in the table in order from the repository root. GitHub Actions does not create a deployment; deployment is configured separately when the repository is connected to a hosting provider.
