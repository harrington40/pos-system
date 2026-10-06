# Tests

Black-box and unit test suites for OpenRx, plus a single-page **reliability
report** that aggregates them all.

| Path | What it is |
|------|------------|
| `ui-tests/` | Browser UI suite (Playwright + pytest). See [`ui-tests/README.md`](ui-tests/README.md). |
| `reliability-artifacts/` | Result inputs the report reads (Jest/Vitest JSON, coverage). Refreshed by CI. |
| `build_reliability_report.py` | Generates the HTML/JSON reliability report. |
| `reliability-report.html` | Generated single-page report (self-contained). |
| `reliability-report.json` | Generated machine-readable metrics (trend/badge). |

The API suites live under `backend/tests/api-tests/` (contract + `e2e/` sweep)
and the JS unit suites live in `backend/src` (Jest) and
`interface/new/src/test` (Vitest).

## Reliability report

One self-contained HTML page showing the *kind* of every suite, its results, a
per-suite **confidence level**, a coverage breakdown (API routes, UI routes,
roles, code coverage) and an overall **reliability index**.

```bash
# regenerate against whatever results are on disk (does not re-run suites)
python3 tests/build_reliability_report.py

# also re-count the pytest suites (--collect-only) and emit the JSON metrics
python3 tests/build_reliability_report.py --collect \
    --json tests/reliability-report.json
```

It is standard-library-only and best-effort: a missing result file is shown as
"not run" instead of failing. Result inputs it looks for:

| Input | Produced by |
|-------|-------------|
| `ui-tests/pytest-results.xml` | `ui-tests/run.sh --junitxml=...` (or the Jenkinsfile) |
| `backend/tests/api-tests/pytest-results.xml` | `ci/run-production-baseline.sh` |
| `backend/tests/api-tests/e2e/pytest-results.xml` | the e2e sweep |
| `reliability-artifacts/jest-results.json` | `cd backend && npx jest --ci --json --outputFile=../tests/reliability-artifacts/jest-results.json` |
| `reliability-artifacts/jest-coverage-summary.json` | `cd backend && npx jest --coverage --coverageReporters=json-summary` then copy `backend/coverage/coverage-summary.json` |
| `reliability-artifacts/vitest-results.json` | `cd interface/new && npx vitest run --reporter=json --outputFile=../../tests/reliability-artifacts/vitest-results.json` |

### Confidence model

- per suite: `score = 100·(0.60·pass_rate + 0.20·execution + 0.20·coverage)`
  (or `100·(0.75·pass_rate + 0.25·execution)` when no code coverage);
- overall: `reliability = 0.75·test_score + 0.25·coverage_score`, weighted by
  kind (unit 1.00 … ui 0.60) and `√size`;
- labels: **High ≥ 90**, **Moderate 75–89**, **Low < 75**; a suite with any
  failing case is capped at Moderate.

The full formula is also rendered on the HTML page.

### Trend

Each run appends its headline metrics to `tests/reliability-history.jsonl`
(one JSON object per line, including a per-suite score map), and the report
renders that as a **reliability trend chart**: a bold line for the overall
reliability index plus a thinner line per suite (backend unit, frontend unit,
API contract, API e2e, UI), with a legend. The file is committed so the history
accumulates over time; use `--no-history` to draw the chart without recording a
new point, or `--history PATH` to point elsewhere. A run with the same timestamp
replaces the last entry instead of duplicating it.

## CI

`backend/tests/api-tests/Jenkinsfile` runs the suites and then the report, and
publishes both the API baseline report and the reliability report through the
Jenkins **HTML Publisher** plugin (see that file's header). The JSON metrics are
archived for trend tracking, and the **reliability index is written to the build
description** (plus a Badge-plugin badge when that plugin is installed).

### Trigger a build with `RUN_JS_TESTS`

`RUN_JS_TESTS` is a build parameter (default `true`). Trigger a build with it
explicitly:

```bash
JENKINS_URL=https://jenkins.example.com \
JENKINS_JOB=openrx-tests \
JENKINS_USER=harrington JENKINS_TOKEN=<api-token> \
    bash tests/ci/trigger-jenkins.sh
```

The script expands folder jobs (`JENKINS_JOB="team/openrx-tests"`), fetches the
CSRF crumb, and posts to `buildWithParameters`. Flags: `--js`/`--no-js`,
`--ui`, `--ui-base-url URL` (also readable from `RUN_JS_TESTS`, `RUN_UI_TESTS`,
`UI_BASE_URL`). To include the Playwright sweep in the same build:

```bash
JENKINS_URL=... JENKINS_JOB=... \
    bash tests/ci/trigger-jenkins.sh --ui --ui-base-url https://openrx.transtechologies.com
```

Or the raw one-liner (a Jenkins API token authenticates the POST):

```bash
curl -fsS -X POST \
  -u "$JENKINS_USER:$JENKINS_TOKEN" \
  "$JENKINS_URL/job/openrx-tests/buildWithParameters?RUN_JS_TESTS=true"
```

To add the UI sweep in the same build, append `&RUN_UI_TESTS=true&UI_BASE_URL=<spa-origin>`.
