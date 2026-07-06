# v0.1.0 — Initial Public OSS Workflow

This is an early-stage public OSS release. Adoption is currently limited; the release establishes a reproducible baseline for testing, review, and future contribution.

## Current capabilities

- Discover and filter public GitHub repositories related to Codex and AI coding.
- Configure focus areas, keywords, thresholds, limits, and scoring weights.
- Generate structured Markdown and JSON reports with selection evidence.
- Run locally or through a scheduled/manual GitHub Actions workflow.
- Optionally include podcast and AI-application radar sections.
- Optionally deliver a consolidated report to Feishu.
- Run automated tests for scoring constraints, reporting, schedules, deduplication, send safeguards, and feedback adapters.

## Known limitations

- Public API rate limits and source availability can reduce candidate coverage.
- Scoring is heuristic and requires continuing evidence-based review.
- Optional semantic review and Feishu delivery require separately configured credentials.
- Contributor activity and external adoption are limited at this early stage.
- The project does not inspect private repositories or execute discovered code.

## Safety boundary

- Discovery reads public repository metadata and public content only.
- Private repositories are not scanned, and discovered third-party code is not executed by default.
- Secrets must be stored in GitHub Secrets or ignored local environment variables; API keys, webhooks, tokens, cookies, and credentials must never be committed.

## Maintainer workflow

The maintainer uses tests, Actions logs, generated reports, and public issues to review changes. Codex may assist with documentation, issue triage, pull-request review, changelog drafting, release preparation, workflow maintenance, testing, and refactoring; the maintainer reviews changes before merge or publication.

## Next steps

- Publish clearer scoring examples and rejection reasons.
- Improve error handling, logging, and Actions reliability.
- Refine issue and pull-request review workflows.
- Evaluate optional read-only project documentation or dashboard views.

See the [four-week roadmap](../ROADMAP.md) for the planned sequence.
