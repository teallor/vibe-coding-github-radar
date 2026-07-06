# Focus Profiles

A focus profile is a reusable set of discovery terms, exclusions, scoring priorities, evidence expectations, and report guidance for one learning goal. Profiles make the selection intent visible without embedding one user's assumptions in the discovery code.

The sample catalog is [`examples/focus_profiles.json`](../examples/focus_profiles.json). It contains three profiles:

- `codex-ai-coding` for Codex, coding-agent, MCP, and AI-coding workflows;
- `office-automation` for document and spreadsheet automation; and
- `oss-learning` for understandable, maintained projects with learning and contribution evidence.

## Current integration status

The catalog is **sample configuration**. The current runtime does not automatically read `examples/focus_profiles.json`, and this project does not claim otherwise. Runtime discovery still reads [`config/focus.json`](../config/focus.json) through `scripts/loadConfig.js`.

To use a sample today, copy the relevant values into `config/focus.json`:

| Sample field | Current runtime field |
| --- | --- |
| `keywords` | `enabledFocusAreas[].keywords` |
| `exclude_keywords` | `enabledFocusAreas[].excludeKeywords` and, where globally appropriate, `blacklistKeywords` |
| `scoring_weights` | `scoringWeights` |
| `preferred_evidence` | Review guidance; not currently a scoring input |
| `report_focus` | Review/report guidance; not currently a runtime field |

This mapping preserves compatibility with existing field meanings while keeping the example honest about planned integration. Selecting and importing profiles automatically remains future work; manually applying a profile requires configuration changes only, not core code changes.

## Why profiles should not be hard-coded

Hard-coded keywords and weights make a discovery tool difficult to audit and reuse. A Codex learner, an office-automation maintainer, and a first-time OSS contributor have different useful signals. Keeping intent in configuration makes those differences reviewable, testable, and changeable through a focused pull request.

Profiles also prevent a temporary interest from silently becoming a permanent product rule. The core scoring implementation remains shared while the emphasis can change.

## Adjust keywords

Start with a small group of phrases that describe observable repository functionality. Include synonyms and tool categories, then inspect false positives before adding more.

For the current runtime:

1. Choose or create an entry under `enabledFocusAreas` in `config/focus.json`.
2. Copy desired sample `keywords` into that area's `keywords` array.
3. Put area-specific exclusions in `excludeKeywords`.
4. Put only broadly unsafe or irrelevant terms in the global `blacklistKeywords` array.
5. Run `npm test`, followed by `npm run dry-run` when public network discovery is intended.

A keyword match creates a candidate; it is not proof that the repository is suitable.

## Adjust scoring weights

The keys in each sample `scoring_weights` object match the current `scoringWeights` dimensions. Each sample totals 100 for readability. Copy the selected object to `config/focus.json`, then review the effects described in [`SCORING_EXAMPLES.md`](SCORING_EXAMPLES.md).

Increase a dimension only when the profile has a clear reason to value that evidence. Do not raise weights merely to push more candidates above the recommendation threshold. Unknown custom dimensions receive a neutral fallback in the current implementation, so adding a new key does not create a meaningful new scoring rule by itself.

## Avoid hype and single-keyword recommendations

Use multiple independent signals:

- direct README evidence supporting the claimed function;
- license clarity and recent maintenance;
- tests, CI, releases, or reproducible setup instructions;
- explicit dependency and deployment requirements; and
- recorded penalties, bonuses, and rejection reasons.

Stars, a fashionable title, owner reputation, or a single occurrence of “Codex” should never decide inclusion. Prefer an honest zero-result report when public evidence is weak. The sample `preferred_evidence` lists are human review guidance and must not be represented as automatically enforced fields.

## Codex and AI-coding discovery workflow

For a Codex/AI-coding review, start with `codex-ai-coding`, map its keywords and exclusions into a focus area, and apply its existing scoring-weight keys. During review, verify that public documentation explains the actual coding workflow, setup, extension points, license, and maintenance evidence. Record why a project was included, excluded, or held for manual review.

The profile narrows attention; it does not establish OpenAI affiliation, endorsement, security, or quality.

## Validation

The automated test suite parses the sample, verifies the three required profile IDs and fields, checks that weights use current scoring-dimension keys and total 100, and rejects secret-shaped field names. Run:

```bash
npm test
```

Do not add credentials, private repository content, personal data, webhook URLs, or local paths to a profile.
