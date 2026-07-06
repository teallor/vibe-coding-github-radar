# Contributing

Thank you for helping improve Vibe Coding GitHub Radar. The project is early-stage, so small, well-evidenced contributions are especially useful.

## Open an issue

Search existing issues first. Use the bug template for reproducible defects and the feature template for narrowly scoped improvements. Include the observed behavior, expected behavior, environment, relevant logs with secrets removed, and steps to reproduce.

## Propose scoring-rule changes

Use the scoring-rule template. Describe the current rule, proposed rule, affected configuration fields, and why the change improves selection quality. Include several public examples, including false positives or false negatives, and explain the expected score impact. Never manipulate rules merely to inflate candidate counts.

## Propose source or keyword changes

Explain the source's public accessibility, relevance, expected signal, and failure behavior. For keywords, include sample matches and likely noisy matches. Sources must not require unauthorized access, private-repository scanning, or a paid dependency for the core workflow.

## Submit a pull request

1. Fork the repository and create a focused branch.
2. Run `npm ci` and `npm test`.
3. Make one coherent change with tests or clear verification evidence.
4. Update documentation and configuration explanations when behavior changes.
5. Complete the pull-request checklist and link the relevant issue.

## Style

- Follow the existing plain JavaScript style and keep functions focused.
- Prefer explicit failure and fallback behavior over silent recovery.
- Add or update Node tests for behavioral changes.
- Write documentation in clear, direct language; distinguish implemented behavior from planned work.
- Keep generated reports out of unrelated pull requests.

## Security and collaboration

Never commit secrets, tokens, cookies, webhook URLs, personal contact details, or local machine paths. Redact logs before posting them. Follow [SECURITY.md](SECURITY.md) for vulnerabilities and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for respectful collaboration. By contributing, you agree that your contribution is licensed under the MIT License.
