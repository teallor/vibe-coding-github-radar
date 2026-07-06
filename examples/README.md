# Examples

This directory is reserved for small, reproducible examples that do not contain credentials or private data.

## Safe local review

Install dependencies and run the tests:

```bash
npm ci
npm test
```

Build a preview from the repository's existing generated data without sending a message:

```bash
npm run preview
```

Run public discovery without Feishu delivery:

```bash
npm run dry-run
```

The dry run performs public network reads and writes generated data locally. Results depend on source availability and API rate limits. Keep API keys, webhook URLs, tokens, cookies, private-repository content, and personal information out of examples and logs.

Future examples should include their expected behavior, exact command, sanitized output, and the configuration fields they demonstrate.
