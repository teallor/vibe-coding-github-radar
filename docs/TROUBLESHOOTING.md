# Operations and Troubleshooting

This guide covers the repository's current local and GitHub Actions workflows. Start with `npm test`; it requires no external credentials and separates code regressions from network or integration failures. Follow progress in [roadmap issue #3](https://github.com/teallor/vibe-coding-github-radar/issues/3).

## GitHub Actions does not run

1. Open **Actions → Daily GitHub Scout** and confirm Actions are enabled for the repository or fork.
2. Confirm `.github/workflows/daily-scout.yml` exists on the default branch.
3. Use **Run workflow** to separate schedule timing from workflow/configuration problems.
4. Under **Settings → Actions → General**, grant `GITHUB_TOKEN` read/write contents permission; the workflow commits generated reports.
5. Check whether another run is queued. The workflow deliberately uses one concurrency group to prevent duplicate Feishu sends.
6. Remember that GitHub schedule delivery can be delayed. Search the job log for `[time]` to compare scheduled, workflow-start, job-start, generation, and send times.

If a manual run works but a scheduled run does not start on time, preserve the run URL and timestamps in an issue. Do not present a delayed schedule as a successful on-time run.

## Actions failure categories

Use the first failed step to classify the problem before changing configuration:

| Failed step or signal | Category | First check |
| --- | --- | --- |
| Install dependencies | Dependency/registry | `package-lock.json`, Node version, and npm registry availability |
| Run configuration and workflow smoke tests | Code/config regression | Named failing test; reproduce locally with `npm test` |
| Log workflow schedule and actual start times | Actions metadata/permissions | `GITHUB_TOKEN` availability and run metadata response |
| Run daily scout | GitHub discovery | Search task summary, public API rate limit, network, and focus config |
| Find and verify Codex podcasts | Public source/RSS | `[podcast-radar]` error and failing source URL |
| Build Gemini-reviewed AI app and Codex ecosystem radar | Source or optional reviewer | `[ai-app-radar]` summary and `[llm-reviewer]` fallback message |
| Push one combined three-part radar to Feishu | Optional delivery | secret presence, `[send-lock]`, and send-ledger status |
| Upload evidence | Artifact retention/path | expected JSON path and earlier generation step |
| Commit generated reports | Repository write | contents permission, concurrent remote update, and staged paths |

The smoke-test step runs before public discovery and delivery, requires no credentials, and emits an Actions error annotation when tests fail. Runtime paths now share the structured categories below so source failures and deliberate fallbacks remain auditable.

## Structured error codes

Runtime diagnostics use `[structured-error]` followed by one JSON object. The shared catalog in `scripts/error-categories.js` always includes `error_code`, `human_readable_message`, `likely_causes`, `suggested_fix`, `workflow_behavior`, and a sanitized `detail`. Query strings and credential-shaped values are redacted before logging.

| `error_code` | Meaning | Workflow behavior | What to do |
| --- | --- | --- | --- |
| `GITHUB_SOURCE_FAILURE` | Public GitHub repository search/read failed | Degrade gracefully and continue other queries | Check rate-limit and HTTP status logs; retry later without lowering quality gates |
| `RSS_SOURCE_FAILURE` | Podcast/RSS source fetch or parse failed | Degrade gracefully and continue other feeds | Inspect the named public feed and retry once |
| `AI_REVIEWER_FAILURE` | Optional AI review timed out, failed, or returned invalid JSON | Degrade gracefully to rule scoring | Check optional provider configuration and confirm the log states the fallback |
| `FEISHU_DELIVERY_FAILURE` | Feishu rejected or did not receive delivery | Fail the delivery step | Check redacted response context, Secrets, and send ledger before a manual retry |
| `CONFIG_VALIDATION_FAILURE` | Focus/default configuration could not be parsed | Degrade gracefully to documented fallback | Validate JSON and compare changed fields with the default config |
| `ENVIRONMENT_VALIDATION_FAILURE` | A required value for the requested operation is absent/invalid | Fail that requested operation | Configure the named GitHub Secret or environment variable; never commit its value |
| `SCHEDULE_RUNTIME_FAILURE` | Actions timing/runtime metadata was unavailable | Degrade gracefully while preserving local timestamps | Compare scheduled, actual-start, generation, and delivery times |

`degrade_gracefully` means the affected optional source or reviewer is recorded and the remaining safe workflow continues. `fail_hard` means the requested delivery or operation cannot be truthfully reported as successful. A graceful fallback is not evidence that the failed source succeeded; use the detail, source-failure arrays, and artifacts together.

## Discovery or report generation fails

Inspect the named workflow step and its summary lines:

- GitHub discovery reports completed/failed task counts, candidate counts, and rate-limit retries.
- `[podcast-radar]` identifies podcast discovery or RSS failures.
- `[ai-app-radar]` reports candidate, qualified, selected, and optional Gemini-success counts.
- `[llm-reviewer] ... using rules` means optional semantic review failed safely and rule-based scoring was used.
- `未发现足够高质量...已跳过，不硬凑` can be a valid zero-result outcome; it is not automatically a workflow failure.

Public APIs can rate-limit or change. Retry a failed manual run once after checking the error. Do not weaken thresholds merely to make a report non-empty.

## Feishu does not receive a report

1. Confirm report generation succeeded before debugging delivery.
2. Confirm `FEISHU_WEBHOOK` and `FEISHU_SECRET` are configured as GitHub **Secrets**, not repository variables.
3. Look for `send-test skipped` when credentials are absent, `[send-lock]` when a report was already sent that day, or a final `sent successfully` line.
4. A same-day successful send is intentionally blocked. Use the manual `force_send` input only when a duplicate send is genuinely required.
5. Check `data/send-ledger.json` for `sent` or `failed` status and the run ID. Do not paste credential-bearing request data into issues.
6. For feedback ingestion rather than outbound delivery, follow [`FEISHU_FEEDBACK_AUTOMATION.md`](FEISHU_FEEDBACK_AUTOMATION.md); it is a separate optional component.

Test safely with `npm run preview` first. `preview` produces a local ignored JSON file and never calls the webhook. `npm run send-test` can perform an external send when credentials are present.

## Configure API keys and secrets safely

The automated tests need no API key. The core workflow can use rule-based scoring when optional AI credentials are absent.

For GitHub Actions:

- Secrets: `FEISHU_WEBHOOK`, `FEISHU_SECRET`, `GEMINI_API_KEY`, and optional `GCP_CREDENTIALS`.
- Non-secret repository variables: `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION`.
- `GITHUB_TOKEN` is supplied automatically by GitHub Actions.

For local work, use temporary shell environment variables or an ignored `.env` file based on `.env.example`. Never put real values in source code, README files, examples, reports, issues, pull requests, or committed `.env` files. Never print credentials while debugging. Rotate a credential immediately if it is exposed.

## Read the logs

In **Actions → Daily GitHub Scout → selected run → scout**, read steps in order:

1. dependency installation;
2. workflow timing;
3. GitHub scout;
4. podcast radar;
5. AI app/Codex ecosystem radar;
6. optional Feishu delivery;
7. evidence artifact uploads; and
8. generated-report commit.

The podcast and AI-app artifact steps run even after many failures and retain screening JSON for 30 days. Download them from the run's **Artifacts** section. Before sharing logs, remove tokens, webhook URLs, service-account fields, cookies, personal data, and local paths.

## Determine whether a report run succeeded

A complete successful run should have evidence for each applicable stage:

- the workflow job is green, or an optional failure/fallback is explicitly explained;
- GitHub discovery prints task and candidate totals;
- radar output distinguishes selected, rejected, failed-source, and valid zero-result states;
- expected JSON files and a dated Markdown report are generated;
- screening artifacts are available for the podcast and AI-app sections;
- the final commit step reports a commit or “No generated changes to commit”; and
- when Feishu is configured and not send-locked, the log contains `sent successfully` and the send ledger records `sent`.

A green workflow without a Feishu send can still be a valid run when delivery is intentionally unconfigured or safely skipped. Conversely, a generated file alone does not prove every source or optional integration succeeded; use the logs and artifacts together.

## Local verification sequence

```bash
npm ci
npm test
npm run preview
npm run dry-run
```

`dry-run` performs public network reads and may update local generated data. Review `git status` afterward. It does not send to Feishu. Do not run `full-run` while troubleshooting unless an external Feishu send is intended and authorized.
