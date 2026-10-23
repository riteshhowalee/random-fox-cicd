# Random Fox — CI/CD with GitHub Actions

A small, complete web app for the assignment **“CI/CD with GitHub Actions.”** Click **Find me a fox** to load a photograph from the [Random Fox API](https://randomfox.ca/). The pipeline runs automated tests and builds a Docker image on every push.

![Actual running app with a photograph loaded from RandomFox](docs/app-preview.png)

## Assignment coverage

| Requirement | Included implementation |
| --- | --- |
| Small app using Random Fox API | Responsive browser UI, Node.js API proxy, loading/error/retry states |
| A few automated tests | 15 tests: API validation, upstream errors, HTTP routes and browser interactions |
| Docker image | `Dockerfile`, minimal build context, non-root user, health check |
| Tests and image build on every push | `.github/workflows/ci.yml`; also pull requests and manual runs |
| Research answers | CI/CD, workflow/job/step/runner and Secrets explained below |

## 1. Run locally

Install **Node.js 24.x** (npm is normally included). No API key or third-party package is required. Internet access is needed to fetch fox data and photographs; automated tests use mocked API responses and do not depend on RandomFox being available.

Extract the ZIP, open a terminal inside `random-fox-cicd`, then run:

```sh
npm ci
npm start
```

Open **http://localhost:3000** and click **Find me a fox**. Click again for another random choice (the API may occasionally choose the same fox). The counter counts successful loads in the current page session. Stop the server with **Ctrl+C**.

If npm is unavailable but Node.js 24 is installed, use `node src/server.js` instead. There are no dependencies to install.

The port defaults to 3000. To change it in PowerShell:

```powershell
$env:PORT = '3001'
node src/server.js
```

On macOS/Linux: `PORT=3001 node src/server.js`. Use the corresponding port in the browser. The server listens on all interfaces to support containers; use only on a trusted local network for the demo.

## 2. Validate

```sh
npm run check
npm test
```

Or without npm:

```sh
node --run check
node --test
```

With the server running in one terminal, use a second terminal for the HTTP smoke test:

```sh
node scripts/smoke.mjs
```

It waits for readiness, then verifies `/health`, the homepage, JavaScript and CSS. For another port, set `BASE_URL`, for example `$env:BASE_URL = 'http://127.0.0.1:3001'` in PowerShell.

The test suite covers valid and unsafe upstream payloads; missing fields; HTTP/network/JSON errors; page/assets/security headers; health; successful and failed API responses; unknown paths; disallowed methods; successful UI updates; API and image-load failures; and retry-button recovery. Browser interaction tests use a small simulated DOM and image loader, not a full browser. Use the manual demo below for visual verification.

## 3. Build and run Docker

Install Docker and **start Docker Desktop with Linux containers** (or a Linux Docker engine). Run these commands inside the project folder:

```sh
docker build --pull -t random-fox:local .
docker run --detach --name random-fox --publish 127.0.0.1:3000:3000 random-fox:local
node scripts/smoke.mjs
docker ps
docker logs random-fox
```

Open http://localhost:3000. `docker ps` should show healthy after the health-check interval. If port 3000 is already occupied, stop the local Node server first or publish `127.0.0.1:3001:3000` and adjust `BASE_URL`.

Clean up:

```sh
docker rm --force random-fox
```

The image uses `node:24-alpine`, copies only runtime files and runs as the built-in unprivileged `node` user. There is no dependency installation in the image because this app has zero dependencies. `/health` measures application readiness independently of the external API. The base-image tag follows updates within Node 24; a production project could pin a digest and automate digest updates for reproducible builds.

## 4. Set up GitHub Actions

1. Create an empty GitHub repository, for example `random-fox-cicd`. Do not initialize it with a separate README.
2. Open a terminal **inside the extracted project**, so `.github`, `Dockerfile` and `package.json` are at the repository root.
3. Run the following commands, replacing `YOUR_USERNAME` with your GitHub username:

```sh
git init
git add .
git commit -m "Add Random Fox app, tests and Docker CI"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/random-fox-cicd.git
git push -u origin main
```

4. Open the repository's **Actions** tab. Enable workflows if GitHub asks. Select **Random Fox CI** and open the run for the pushed commit.
5. Confirm both **Check and test** and **Build and smoke-test Docker image** are green. Expand their steps to show the test results and Docker build output.
6. Make another small change and push it to demonstrate automatic execution. The workflow has no branch/path filters, so every push triggers a run. It also runs for pull requests and can be started with **Run workflow** on the default branch.

No user-created secrets or registry accounts are needed. GitHub-hosted Ubuntu runners provide Docker. The `test` job sets up Node 24, installs from the lockfile, checks syntax and runs all tests. The `docker` job uses `needs: test`, so an image is built only if the tests pass. It builds `random-fox:<commit SHA>`, starts a container, smoke-tests it, and always attempts to print logs and remove the container. A failed test blocks the build; a failed build or smoke test fails the workflow.

The image exists on that job's temporary runner and disappears when the job ends. This workflow does **not** publish an image or deploy a website. That matches the assignment's required test-and-build scope. Do not claim a successful hosted run until you have pushed the repository and checked the Actions results.

## 5. Research: CI vs CD

**Continuous Integration (CI)** means frequently integrating code changes and automatically checking them. Here, each push runs syntax checks, automated tests, an image build and a container smoke test. This catches regressions early and checks that the app can be packaged.

**Continuous Delivery (CD)** extends CI to produce and make a release available for deployment, usually with a manual approval before production. For this project, a delivery extension could publish the tested image to a container registry and require approval through a GitHub environment before deployment.

**Continuous Deployment** automatically deploys every qualifying change after the checks pass, without a manual production approval. For this app, that would require a hosting destination, registry and deployment credentials or workload identity. Those are outside the assignment and are not configured here. Building a Docker image alone is not deployment.

## 6. Research: workflow, job, step and runner

| Term | Meaning | Example in this project |
| --- | --- | --- |
| Workflow | An automated process defined in a YAML file under `.github/workflows` | `ci.yml`, triggered by push, pull request or manual dispatch |
| Job | A group of steps that execute on one runner; jobs can depend on other jobs | `test`, then `docker` with `needs: test` |
| Step | One task inside a job, either a shell command (`run`) or reusable action (`uses`) | `npm test`, or `actions/checkout@v7` |
| Runner | The machine/agent that executes a job | A fresh GitHub-hosted Ubuntu runner selected by `runs-on: ubuntu-latest` |

Steps run in order and share the job's workspace. The two jobs use separate runners, so the Docker job checks out the repository again. Job files and local images are not automatically shared between runners.

```text
Push / Pull request / Manual run
             |
      test job (Ubuntu)
      checkout -> Node 24 -> npm ci -> syntax -> tests
             | only on success
      docker job (separate Ubuntu runner)
      checkout -> build image -> start -> smoke test -> cleanup
```

## 7. Research: GitHub Secrets and password security

GitHub Secrets store sensitive values at repository, environment or organization scope and expose them to authorized workflow steps when explicitly referenced. For example, a future registry-publishing step could read `${{ secrets.REGISTRY_TOKEN }}` through a step environment variable. Create a secret under **Settings → Secrets and variables → Actions → New repository secret**; use environment secrets and approvals for deployment credentials.

An illustrative fragment for a future delivery workflow (not active in this project):

```yaml
- name: Authenticate to a future container registry
  env:
    REGISTRY_USER: ${{ vars.REGISTRY_USER }}
    REGISTRY_TOKEN: ${{ secrets.REGISTRY_TOKEN }}
  run: printf '%s' "$REGISTRY_TOKEN" | docker login ghcr.io --username "$REGISTRY_USER" --password-stdin
```

Use a narrowly scoped token appropriate to the registry and grant only required permissions. For GHCR, the job-scoped `GITHUB_TOKEN` with appropriate package permissions is often preferable to a long-lived personal token. For cloud deployment, prefer short-lived identity federation (OIDC) when supported.

Never put real passwords, API keys or tokens in source code, workflow YAML, Dockerfiles, image layers or committed `.env` files. Git history, forks, downloaded ZIPs, logs and images can retain them after deletion. If a credential is exposed, revoke/rotate it immediately and then remove the leaked material. GitHub masks registered secrets in logs, but masking is not a guarantee for transformed values: never print secrets, enable shell tracing around them or place them in command arguments unnecessarily. Base64 encoding is not encryption.

Secrets are generally withheld from fork pull-request workflows (apart from the restricted `GITHUB_TOKEN`); do not use `pull_request_target` to execute untrusted code with privileged credentials. Here, the workflow uses `permissions: contents: read`, disables persisted checkout credentials, disables automatic package caching, has job timeouts and uses no custom secrets. The Random Fox API is public and needs no authentication. The Docker build context is an allowlist of runtime files, preventing accidental inclusion of `.env` files and Git history.

Official actions use versioned major tags for readability. Higher-assurance projects should pin reviewed full commit SHAs and use an update process to keep those pins current.

## 8. Demo and submission checklist

1. Show the app in a browser. Click the button, show a fox photograph, click again, then open its source link.
2. Narrow the browser window to demonstrate the mobile layout. Use keyboard Tab/Enter to activate the button.
3. Run `npm test` and show all tests passing. Explain that API requests are mocked, so third-party availability does not make CI flaky.
4. Run the Docker build and container commands above. Show `/health`, the app and the container logs.
5. Push a change and show the Actions run: tests complete before the image build begins.
6. Explain CI vs delivery/deployment, point to the workflow/jobs/steps/runner, and explain why secrets are never committed.
7. Submit this project ZIP and your GitHub repository URL. If the evaluator requires evidence, capture your actual app, passing test output and green Actions run; do not substitute fabricated screenshots.

Optional failure demo on a temporary branch: change the expected health status in a test to an incorrect value, push and observe the failing test and skipped Docker job, then revert the change and push again. Keep the submitted branch passing.

### Troubleshooting

- **`npm` is not recognized:** install Node.js 24 with npm, reopen the terminal, or use the dependency-free Node commands above. On PowerShell systems that block `npm.ps1`, use `npm.cmd`.
- **Docker daemon connection error:** start Docker Desktop, select Linux containers and wait until the engine is ready.
- **Address already in use:** stop the other server/container or choose another port.
- **Fox does not load:** allow outbound HTTPS to `randomfox.ca`. The server fetches API JSON; the browser downloads the image directly. Retry after an API outage. Loading and image requests have timeouts.
- **Actions does not appear:** ensure `.github/workflows/ci.yml` is at the repository root, workflows are enabled, and the repository/organization permits the official actions. Use GitHub-hosted runners; custom old runners may not support current action runtimes.
- **Restricted sandbox:** local HTTP tests require permission to connect to loopback. Run them in an ordinary local terminal if your sandbox blocks sockets.

## Project layout

```text
.github/workflows/ci.yml  # push/PR/manual pipeline
src/fox.js               # API fetch, timeout and payload validation
src/server.js            # HTTP routes, static files and health
public/                  # responsive HTML, CSS and browser code
test/                    # offline API, HTTP and UI interaction tests
scripts/smoke.mjs        # running-app/container smoke test
Dockerfile               # non-root Node 24 image
.dockerignore            # runtime-file allowlist
package.json             # scripts; zero third-party dependencies
package-lock.json        # lockfile for npm ci
VALIDATION.md            # actual validation results and limitations
README.md                # setup, research and demo guide
```

## Sources

- [RandomFox website](https://randomfox.ca/) and [JSON endpoint](https://randomfox.ca/floof/) — returns `image` and `link` fields.
- [GitHub Actions documentation](https://docs.github.com/en/actions).
- [Understanding GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions) — workflows, jobs, steps and runners.
- [Using secrets in GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets) — scope, creation and usage of secrets.
- [Official checkout action](https://github.com/actions/checkout) and [setup-node action](https://github.com/actions/setup-node) — action usage and permissions.
