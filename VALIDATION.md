# Validation results

Validated locally with Node.js **v24.22.1** on Windows.

| Check | Result |
| --- | --- |
| JavaScript syntax (`node --run check`) | PASS |
| Automated tests (`node --test`) | PASS: 15 tests, 0 failed, 0 skipped |
| Running-server smoke test (`node scripts/smoke.mjs`) | PASS: health, homepage, JavaScript and CSS |
| Live upstream integration (`GET /api/fox`) | PASS: HTTP 200 with valid RandomFox image and source URLs |
| Browser demo | PASS: clicked Find me a fox; real photograph, source link, success message and NO. 001 displayed |
| Visual review | Desktop layout inspected in the in-app browser; actual screenshot saved as `docs/app-preview.png` |
| Docker build / container run | NOT RUN locally: Docker client 29.6.2 is installed, but the Docker Desktop Linux engine pipe is unavailable |
| Hosted GitHub Actions run | NOT RUN: requires pushing this project to a GitHub repository |
| `npm ci` | NOT RUN locally: npm is unavailable on this machine; the app has no third-party dependencies and the lockfile is included |

An initial sandbox-restricted run blocked loopback connections (`EACCES`). After network permission was granted, the full suite passed. The submitted tests do not skip socket tests or hide this restriction.

The workflow is configured to run syntax checks and the full suite, then build and smoke-test the actual Docker container on GitHub-hosted Ubuntu. Local app success does not prove that the image or hosted workflow has run successfully. Before presenting CI results, push the project and verify both jobs in the Actions tab using the README instructions.

UI interaction tests simulate a DOM and image loader. The browser demo additionally checked the real success path with a live image. A physical mobile device, full browser accessibility audit, load testing and production deployment were not part of local validation. The responsive stylesheet and keyboard-friendly controls are included for the manual demo.

No credentials, registry publishing or deployment are required by the assignment. No fabricated CI logs or Docker results are included.
