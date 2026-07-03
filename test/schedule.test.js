const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadRuntimeConfig } = require('../scripts/runtime-config');

test('schedule starts early enough for an approximately 06:45 Feishu delivery', () => {
  const runtime = loadRuntimeConfig();
  const workflow = fs.readFileSync('.github/workflows/daily-scout.yml', 'utf8');
  assert.equal(runtime.timezone, 'Asia/Shanghai');
  assert.equal(runtime.runTime, '06:28');
  assert.equal(runtime.targetDeliveryTime, '06:45');
  assert.equal(runtime.expectedDurationMinutes, 14);
  assert.match(workflow, /cron:\s*["']28 22 \* \* \*["']/);

  const startMinutes = 6 * 60 + 28;
  const expectedDelivery = startMinutes + runtime.expectedDurationMinutes;
  assert.equal(expectedDelivery, 6 * 60 + 42);
  assert.ok(expectedDelivery <= 6 * 60 + 45);
});
