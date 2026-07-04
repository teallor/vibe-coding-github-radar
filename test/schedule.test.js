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
