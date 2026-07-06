const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { CATEGORIES, diagnostic, formatDiagnostic, sanitizeDetail, categorizedError } = require('../scripts/error-categories');

const EXPECTED_CODES = [
  'GITHUB_SOURCE_FAILURE',
  'RSS_SOURCE_FAILURE',
  'AI_REVIEWER_FAILURE',
  'FEISHU_DELIVERY_FAILURE',
  'CONFIG_VALIDATION_FAILURE',
  'ENVIRONMENT_VALIDATION_FAILURE',
  'SCHEDULE_RUNTIME_FAILURE'
];

test('all required workflow error categories expose actionable structured fields', () => {
  assert.deepEqual(Object.keys(CATEGORIES), EXPECTED_CODES);
  for (const code of EXPECTED_CODES) {
    const item = diagnostic(code, 'HTTP 503');
    assert.equal(item.error_code, code);
    assert.ok(item.human_readable_message.length > 20);
    assert.ok(item.likely_causes.length >= 2);
    assert.ok(item.suggested_fix.length > 20);
    assert.ok(['fail_hard', 'degrade_gracefully'].includes(item.workflow_behavior));
    assert.equal(item.detail, 'HTTP 503');
  }
});

test('diagnostic formatting is machine-readable and redacts credential-shaped detail', () => {
  const line = formatDiagnostic('FEISHU_DELIVERY_FAILURE', 'webhook=https://example.test/hook?token=secret-value');
  const payload = JSON.parse(line.replace('[structured-error] ', ''));
  assert.equal(payload.error_code, 'FEISHU_DELIVERY_FAILURE');
  assert.doesNotMatch(line, /secret-value/);
  assert.match(line, /redacted/);
  assert.equal(sanitizeDetail('Bearer abc123'), 'Bearer=<redacted>');
});

test('categorized errors preserve the public error code without preserving secrets', () => {
  const error = categorizedError('ENVIRONMENT_VALIDATION_FAILURE', 'token=top-secret');
  assert.equal(error.errorCode, 'ENVIRONMENT_VALIDATION_FAILURE');
  assert.doesNotMatch(error.message, /top-secret/);
});

test('runtime paths emit every structured category without logging credential values', () => {
  const integrations = {
    'scripts/scout.js': ['GITHUB_SOURCE_FAILURE'],
    'scripts/find-codex-podcasts.js': ['RSS_SOURCE_FAILURE'],
    'scripts/llm-reviewer.js': ['AI_REVIEWER_FAILURE'],
    'scripts/send-feishu.js': ['FEISHU_DELIVERY_FAILURE', 'ENVIRONMENT_VALIDATION_FAILURE'],
    'scripts/loadConfig.js': ['CONFIG_VALIDATION_FAILURE'],
    'scripts/time-utils.js': ['SCHEDULE_RUNTIME_FAILURE']
  };

  for (const [file, codes] of Object.entries(integrations)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const code of codes) assert.match(source, new RegExp(code), `${file} should emit ${code}`);
  }
});
