const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../scripts/loadConfig');
const { generateSearchTasks } = require('../scripts/keywords');
const { calibrateScore } = require('../scripts/scoring');
const { searchGitHub, generateSummary } = require('../scripts/scout');

function response(status, body, headers = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)]));
  return {
    status, ok: status >= 200 && status < 300, statusText: status === 200 ? 'OK' : 'Forbidden',
    headers: { get: name => lower[String(name).toLowerCase()] ?? null },
    json: async () => body
  };
}

test('GitHub search tasks stay within one search-rate window', () => {
  const { config } = loadConfig();
  const tasks = generateSearchTasks(config);
  assert.equal(tasks.length, 30);
  assert.ok(tasks.every(task => !/\blanguage:/.test(task.query)));
});

test('old strict score 70 maps to the unified 85-point threshold', () => {
  assert.equal(calibrateScore(70), 85);
  assert.equal(calibrateScore(75), 88);
  assert.ok(calibrateScore(60) < 85);
});

test('GitHub rate limit waits and retries instead of losing the task', async () => {
  let calls = 0; let waits = 0; let retries = 0;
  const items = await searchGitHub('codex', 'token', {
    fetchImpl: async () => ++calls === 1
      ? response(403, {}, { 'x-ratelimit-reset': Math.floor(Date.now() / 1000) })
      : response(200, { items: [{ full_name: 'openai/codex' }] }, { 'x-ratelimit-remaining': 10 }),
    sleepImpl: async () => { waits += 1; },
    onRetry: () => { retries += 1; }
  });
  assert.equal(calls, 2);
  assert.equal(waits, 1);
  assert.equal(retries, 1);
  assert.equal(items[0].full_name, 'openai/codex');
});

test('zero-result summary distinguishes complete search from failure', () => {
  assert.match(generateSummary(null, {}, { complete: true }, 254), /完整筛选 254 个候选/);
  assert.match(generateSummary(null, {}, { complete: false, succeeded: 15, taskCount: 30 }, 100), /搜索未完整完成/);
});
