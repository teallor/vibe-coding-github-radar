# Security Policy

## Supported versions

This project is early-stage. Security fixes are applied to the latest commit on `main` and to the latest published release when practical. Older snapshots are not supported.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting feature for this repository when available: **Security → Report a vulnerability**. If private reporting is unavailable, open a minimal issue asking the maintainer to enable a private reporting channel; do not include exploit details or secrets in that public issue.

Please include affected files or versions, reproduction steps, impact, and a suggested mitigation when known. Allow the maintainer reasonable time to investigate before public disclosure.

## Scope and boundaries

This policy covers code and workflows in this repository only. It does not authorize scanning GitHub, OpenAI, Feishu, Google, third-party repositories, private repositories, accounts, or infrastructure. Do not test against systems you do not own or lack permission to assess.

The default radar reads public metadata and public content. It does not clone or execute discovered third-party repositories.

## Secret handling

- Never post secrets, API keys, webhook URLs, tokens, cookies, service-account JSON, or private logs in issues, discussions, commits, or pull requests.
- Store CI credentials in GitHub Secrets, not repository variables or tracked files.
- Keep local values in environment variables or an ignored `.env` file; `.env.example` must contain placeholders only.
- Use least-privilege, project-specific credentials and rotate them immediately if exposure is suspected.
- Redact credentials and personal data from logs before sharing them.

The repository's routine tests require no external credentials. Optional Feishu and AI-review integrations should fail safely or fall back when credentials are absent.
