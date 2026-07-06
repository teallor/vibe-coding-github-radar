const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadRuntimeConfig } = require('../scripts/runtime-config');

test('schedule starts at 06:20 and waits to send Feishu near 06:45', () => {
  const runtime = loadRuntimeConfig();
  const workflow = fs.readFileSync('.github/workflows/daily-scout.yml', 'utf8');
  assert.equal(runtime.timezone, 'Asia/Shanghai');
  assert.equal(runtime.runTime, '06:20');
  assert.equal(runtime.targetDeliveryTime, '06:45');
  assert.equal(runtime.expectedDurationMinutes, 12);
  assert.match(workflow, /cron:\s*["']20 22 \* \* \*["']/);
  assert.match(workflow, /Target Feishu send time: Asia\/Shanghai 06:45/);
  assert.match(workflow, /wait_until_target/);
  assert.match(workflow, /WAIT_UNTIL_TARGET/);
});

test('workflow runs credential-free smoke tests before public discovery', () => {
  const workflow = fs.readFileSync('.github/workflows/daily-scout.yml', 'utf8');
  const smokeStep = workflow.indexOf('Run configuration and workflow smoke tests');
  const discoveryStep = workflow.indexOf('Run daily scout');

  assert.ok(smokeStep >= 0, 'workflow should expose a named smoke-test step');
  assert.match(workflow, /if ! npm test/);
  assert.match(workflow, /::error::Smoke tests failed/);
  assert.ok(smokeStep < discoveryStep, 'smoke tests should run before public discovery');
});
