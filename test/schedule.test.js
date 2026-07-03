const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadRuntimeConfig } = require('../scripts/runtime-config');

test('schedule starts early enough for an approximately 08:00 Feishu delivery', () => {
  const runtime = loadRuntimeConfig();
  const workflow = fs.readFileSync('.github/workflows/daily-scout.yml', 'utf8');
  assert.equal(runtime.timezone, 'Asia/Shanghai');
  assert.equal(runtime.runTime, '07:42');
  assert.equal(runtime.targetDeliveryTime, '08:00');
  assert.equal(runtime.expectedDurationMinutes, 14);
  assert.match(workflow, /cron:\s*["']42 23 \* \* \*["']/);

  const startMinutes = 7 * 60 + 42;
  const expectedDelivery = startMinutes + runtime.expectedDurationMinutes;
  assert.equal(expectedDelivery, 7 * 60 + 56);
  assert.ok(expectedDelivery <= 8 * 60);
});
