# Scoring Transparency and Examples

This document explains the current GitHub repository scoring implementation in [`scripts/scoring.js`](../scripts/scoring.js). It is descriptive, not a claim that the heuristic is universally correct. Contributors should propose changes with public, reproducible examples in [roadmap issue #2](https://github.com/teallor/vibe-coding-github-radar/issues/2).

## How a repository reaches review

1. Enabled focus areas in [`config/focus.json`](../config/focus.json) produce public GitHub search queries.
2. Focus-area settings such as keywords, minimum stars, and recent-update windows narrow the candidate pool.
3. `scoreProject` calculates weighted dimension scores from public GitHub metadata.
4. Explicit penalties and bonuses are recorded rather than hidden.
5. The raw 0–100 score is calibrated so the previous strict threshold of 70 maps to the current 85-point scale.
6. Where enabled, semantic review uses README evidence after the rule-based gates. If the optional reviewer is unavailable, the workflow records the fallback and continues with rules.

The generated `scoreBasis`, `penalties`, and `bonuses` fields are the audit trail. A high score is a discovery aid, not a security review or endorsement.

## Scoring dimensions

Default weights come from `config/focus.json` and currently total 100:

| Dimension | Default weight | Public signals currently considered |
| --- | ---: | --- |
| Vibe Coding learning value | 20 | Description detail, language, repository size, fork status, and limited popularity signals |
| Office automation value | 20 | Office/document-format terms in repository name and description |
| Monetization potential | 15 | Tool, service, automation, generator, and template terms; matching focus area |
| Codex friendliness | 15 | Starter/example/CLI/framework terms, repository size, and a bounded star range |
| Beginner friendliness | 10 | Description detail, beginner/tutorial terms, size, and limited popularity signals |
| Local-first suitability | 10 | Local/offline/standalone terms, reduced by server/cloud/deployment terms |
| Activity | 5 | Months since the last public push or update |
| License clarity | 5 | Presence and SPDX category of the reported license |

The configuration can change these weights. Unknown custom dimensions receive a neutral 50% of their configured weight until code implements a specific calculator; this behavior should be considered when reviewing custom profiles.

## Penalties and bonuses

Current penalties include archived status, long inactivity, no detected license, a very short description, apparent paid-API requirements, complex-cloud terms, extremely high project size-by-popularity risk, and blacklist matches. Current bonuses include whitelist keywords, preferred languages, and preferred owners.

These are heuristic signals. For example, a missing GitHub license field is evidence of uncertainty, not proof that no license text exists; a keyword match is not proof of a deployment requirement. README evidence and human review should resolve ambiguity.

## Strong and weak evidence

Strong evidence is public, directly inspectable, and tied to the criterion being evaluated:

- a detected SPDX license and a matching `LICENSE` file;
- recent public commits or releases;
- a README with install, run, and architecture instructions;
- tests or CI visible in the public repository;
- a small, understandable codebase for a beginner/local-first claim; and
- explicit documentation that an integration is optional or required.

Weak evidence should not decide inclusion on its own:

- stars, forks, or social-media attention without maintainability evidence;
- marketing language such as “production ready” without tests or releases;
- a keyword in the name with no supporting README content;
- generated descriptions, topic tags, or screenshots without reproducible instructions; and
- assumptions based only on owner reputation.

## Three illustrative evaluations

The following are fictional templates, not claims about real repositories. Exact scores depend on the current configuration and evaluation date.

### Example 1 — Include for learning review

**Public evidence:** An actively maintained JavaScript CLI has an MIT license, a detailed README, tests, a small repository size, and local/offline usage. Its description matches an enabled Codex-learning focus area.

**Likely dimension effects:** Strong learning, Codex-friendly, beginner, local-first, activity, and license signals. It may receive keyword/language bonuses. No inactivity, license, cloud, or paid-API penalty is expected.

**Decision template:** Include if it clears the configured threshold and README review confirms the public metadata. State which dimensions and evidence supported inclusion; do not cite stars as the primary reason.

### Example 2 — Exclude despite popularity

**Public evidence:** A highly starred repository is archived, has not been updated for several years, lacks a detected license, and provides only a short description.

**Likely dimension effects:** Some popularity-derived learning signals may rise, but activity and license dimensions are weak. Archived, inactivity, missing-license, short-description, and possibly over-engineering penalties apply.

**Decision template:** Exclude when the final score remains below the threshold or maintenance/license uncertainty makes it unsuitable. Explain the concrete penalties; popularity alone cannot override them.

### Example 3 — Hold or exclude because evidence is ambiguous

**Public evidence:** A new Python automation repository matches several keywords and is recently updated, but its README does not explain whether a paid API is mandatory and no license is detected.

**Likely dimension effects:** Focus, language, and activity signals are positive. License is zero, a missing-license penalty applies, and paid-service wording may add another penalty. Keyword matches are not enough to establish safe local use.

**Decision template:** Exclude or mark for manual review until public documentation resolves the license and dependency questions. Record uncertainty rather than inventing a favorable interpretation.

## Why the workflow avoids random browsing and hype

Random browsing changes with search order, memory, and social attention. This workflow keeps focus configuration, candidate thresholds, weights, penalties, bonuses, and generated evidence in version control. That makes the selection reproducible enough to question and improve through issues and pull requests.

The workflow deliberately allows zero recommendations. It does not need to fill a quota, and it does not treat popularity as proof of quality, safety, maintainability, or suitability for a learner.

## Evaluation template for contributors

When proposing a scoring change, provide:

1. Public repository URL and evaluation date.
2. Focus area and matched query/keywords.
3. Public metadata and README evidence used.
4. Dimension effects, penalties, and bonuses expected.
5. Current outcome and proposed outcome.
6. Why the change reduces false positives or false negatives.
7. A counterexample that should remain unaffected.

Never include private repository content, credentials, or personal data in an evaluation.
