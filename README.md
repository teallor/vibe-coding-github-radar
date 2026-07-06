# Vibe Coding GitHub Radar

[![Daily GitHub Scout](https://github.com/teallor/vibe-coding-github-radar/actions/workflows/daily-scout.yml/badge.svg)](https://github.com/teallor/vibe-coding-github-radar/actions/workflows/daily-scout.yml)
[![CI](https://github.com/teallor/vibe-coding-github-radar/actions/workflows/ci.yml/badge.svg)](https://github.com/teallor/vibe-coding-github-radar/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/teallor/vibe-coding-github-radar)](https://github.com/teallor/vibe-coding-github-radar/commits/main)
[![Status: early stage](https://img.shields.io/badge/status-early--stage-orange)](ROADMAP.md)

> Vibe Coding GitHub Radar is an open-source workflow for discovering, filtering, reviewing, and learning from Codex / AI-coding related GitHub projects.

**Original Author: Rafael_Huang**

**Maintainer: [teallor](https://github.com/teallor)**

**License:** [MIT](LICENSE)

**Status:** early-stage, actively maintained

**Purpose:** OSS discovery, review and learning workflows, GitHub Actions automation, and optional Feishu delivery

This is an early-stage project. Current adoption metrics are limited, and this repository does not claim broad community use. Its present value is a reproducible discovery workflow, transparent and configurable scoring, a practical evidence trail, and automation that maintainers can inspect and improve.

## What it does

- Discovers Codex and AI-coding related public repositories.
- Filters and scores candidate projects with configurable rules and weights.
- Generates structured daily reports with selection evidence.
- Supports configurable keywords, focus areas, limits, and scoring weights.
- Can deliver one consolidated report to Feishu when secrets are configured.
- Runs locally or on a scheduled GitHub Actions workflow.
- Keeps generated reports, logs, and screening artifacts for review.
- Also supports optional podcast and AI-application radar sections.

## Why this is useful for open source

- Helps non-expert users learn from real open-source AI-coding projects.
- Makes project discovery reproducible instead of relying on random browsing.
- Encourages transparent scoring and evidence-based selection.
- Provides a maintainable workflow that contributors can improve through issues and pull requests.

The workflow intentionally prefers an honest empty result over filling a report with weak candidates. Public GitHub metadata and README evidence are used to explain why an item was selected or rejected.

## Quick start

Requirements: Git and Node.js 18 or newer. The repository works without a paid API: when optional Gemini or Vertex AI credentials are absent, semantic review falls back to rule-based scoring. Feishu delivery is also optional.

```bash
git clone https://github.com/teallor/vibe-coding-github-radar.git
cd vibe-coding-github-radar
npm ci
npm test
npm run dry-run
```

`npm run dry-run` reads public sources and writes local report data without sending anything to Feishu. It requires network access and may be affected by public API rate limits.

To inspect the existing generated data without making network requests:

```bash
npm run preview
```

`preview` builds a Feishu-card preview from current data but does not send it. The output file is ignored by Git.

## Configuration

1. Edit [`config/focus.json`](config/focus.json) for discovery areas, keywords, and scoring weights.
2. Edit [`config/runtime.json`](config/runtime.json) for per-radar thresholds and limits.
3. Copy [`.env.example`](.env.example) only if you need optional integrations. Keep real values in your shell or a local ignored `.env` file.
4. Never commit API keys, webhooks, service-account JSON, tokens, or cookies.

Optional local environment variables include `GEMINI_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `FEISHU_WEBHOOK`, and `FEISHU_SECRET`. None is required to run the automated test suite.

Useful commands:

| Command | Purpose | External effect |
| --- | --- | --- |
| `npm test` | Run the complete automated test suite | None |
| `npm run dry-run` | Discover, score, and generate data | Public network reads; no Feishu send |
| `npm run preview` | Build a preview from existing data | None |
| `npm run scout` | Run the GitHub repository radar | Public network reads; writes report data |
| `npm run full-run` | Generate all sections and deliver one report | May send to Feishu when configured |

## GitHub Actions

The [`Daily GitHub Scout`](.github/workflows/daily-scout.yml) workflow installs dependencies, builds the radar sections, optionally sends the consolidated report, uploads screening evidence, and commits generated reports. To use it in a fork:

1. Enable GitHub Actions.
2. Grant the workflow read/write repository contents permission because it commits generated reports.
3. Add optional credentials under **Settings → Secrets and variables → Actions**. Use GitHub Secrets for `FEISHU_WEBHOOK`, `FEISHU_SECRET`, `GEMINI_API_KEY`, and `GCP_CREDENTIALS`; use repository variables for non-secret project/location settings.
4. Run **Daily GitHub Scout → Run workflow** once and inspect its logs and artifacts.

GitHub supplies `GITHUB_TOKEN` to the workflow; do not create or commit a personal token for routine operation.

## Safety and compliance boundaries

- The project only reviews public repository metadata and public content.
- It is an independent community project and does not claim affiliation with or endorsement by OpenAI.
- It does not scan private repositories.
- It does not clone or execute untrusted third-party code by default.
- Secrets must be configured through GitHub Secrets or a local ignored environment file.
- API keys, webhook URLs, tokens, cookies, and credentials must never be committed.
- Contributors must not use this repository for unauthorized scanning of third-party systems.

See the full [security policy](SECURITY.md).

## Maintainer workflow with Codex

Codex can responsibly assist the maintainer with documentation improvement, issue triage, pull-request review, changelog drafting, release preparation, workflow maintenance, testing, and refactoring. Human review remains required before merging changes, changing secrets, publishing releases, or enabling external integrations.

## Repository map

```text
config/       Discovery profiles, thresholds, and runtime settings
data/         Generated radar data and audit ledgers
docs/         Operational and review documentation
examples/     Safe example workflows and expected outputs
reports/      Generated Markdown reports
scripts/      Discovery, scoring, reporting, and delivery scripts
src/          Static web interface
test/         Node.js automated tests
workers/      Optional Feishu feedback adapters
.github/      Actions workflow and contribution templates
```

## Project governance

- [v0.1.0 release](https://github.com/teallor/vibe-coding-github-radar/releases/tag/v0.1.0)
- [Roadmap](ROADMAP.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Changelog](CHANGELOG.md)
- [OpenAI Codex for Open Source review notes](docs/OPENAI_CODEX_FOR_OSS_EVIDENCE.md)
- [Scoring transparency and examples](docs/SCORING_EXAMPLES.md)
- [Focus profiles guide](docs/FOCUS_PROFILES.md)
- [Focus profiles sample](examples/focus_profiles.json)
- [Operations and troubleshooting](docs/TROUBLESHOOTING.md)
- [Documentation index](docs/README.md)
- [MIT License](LICENSE)

Issues and pull requests are welcome, especially when they include reproducible evidence for discovery or scoring changes.
