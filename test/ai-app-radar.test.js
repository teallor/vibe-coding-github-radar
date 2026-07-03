const test = require('node:test');
const assert = require('node:assert/strict');
const { loadRuntimeConfig } = require('../scripts/runtime-config');
const { runAiAppRadar, ruleReview, classifyType, priorityFor } = require('../scripts/ai-app-radar');
const { reviewCandidate } = require('../scripts/llm-reviewer');
const { buildDailyCard, sendCardOnce } = require('../scripts/send-feishu');

function candidate(index, title = `OpenAI Codex CLI workflow ${index}`) {
  return {
    title, url: `https://github.com/example/tool-${index}`,
    description: 'Official released tool available now with GitHub Actions automation, agent workflow, install guide and Office automation examples for PPT Word Excel projects.',
    publishedAt: new Date().toISOString(), source: 'GitHub', sourceType: 'github', reliability: 10
  };
}

test('AI app radar enforces max three and 85 threshold', async () => {
  const runtime = loadRuntimeConfig();
  const result = await runAiAppRadar({ runtime, candidates: Array.from({ length: 5 }, (_, i) => candidate(i)), write: false, reviewerOptions: { forceUnavailable: true } });
  assert.equal(result.recommendations.length, 3);
  assert.ok(result.recommendations.every(item => item.score >= 85));
});

test('low-quality candidate is rejected and zero result says 不硬凑', async () => {
  const runtime = loadRuntimeConfig();
  const weak = { title: 'Company funding rumor', url: 'https://example.com/rumor', description: 'funding rumor', publishedAt: '2020-01-01', source: 'unknown', reliability: 1 };
  assert.ok(ruleReview(weak, runtime).score < 85);
  const result = await runAiAppRadar({ runtime, candidates: [weak], write: false, reviewerOptions: { forceUnavailable: true } });
  assert.equal(result.recommendations.length, 0);
  assert.match(result.conclusion, /不硬凑/);
});

test('Gemini cannot override the hard exclusion for acquisition news', async () => {
  const runtime = loadRuntimeConfig();
  const acquisition = { title: 'OpenAI to acquire Example', url: 'https://example.com/acquisition', description: 'Official acquisition announcement with agent technology.', publishedAt: new Date().toISOString(), source: 'Official', reliability: 10 };
  const mockText = JSON.stringify({ shouldRecommend: true, score: 99, type: 'Agent 工具', oneLineConclusion: 'x', whatHappened: 'x', consumerUseCase: 'x', valueForRafael: 'x', codexIntegrationPotential: 'x', actionSuggestion: 'x', reasons: [], risksOrMissingInfo: [], evidenceRequired: true });
  const result = await runAiAppRadar({ runtime, candidates: [acquisition], write: false, reviewerOptions: { mockText } });
  assert.equal(result.recommendations.length, 0);
});

test('missing Gemini and invalid JSON both fall back without throwing', async () => {
  const cfg = loadRuntimeConfig().radars.aiApp;
  const oldKey = process.env.GEMINI_API_KEY; const oldProject = process.env.GOOGLE_CLOUD_PROJECT;
  delete process.env.GEMINI_API_KEY; delete process.env.GOOGLE_CLOUD_PROJECT;
  const missing = await reviewCandidate(candidate(1), 'aiApp', {}, cfg);
  const invalid = await reviewCandidate(candidate(1), 'aiApp', {}, cfg, { mockText: 'not-json' });
  if (oldKey) process.env.GEMINI_API_KEY = oldKey; if (oldProject) process.env.GOOGLE_CLOUD_PROJECT = oldProject;
  assert.equal(missing.status, 'unavailable');
  assert.equal(invalid.status, 'unavailable');
});

test('Codex, Skills and MCP priority outranks generic AI news', () => {
  assert.equal(classifyType('OpenAI Codex CLI released'), 'Codex');
  assert.ok(priorityFor('Codex', '') < priorityFor('AI 产品功能', 'chatgpt feature'));
  assert.ok(priorityFor('MCP', '') < priorityFor('模型更新', 'model'));
});

test('runtime limits GitHub and podcast radars to two', () => {
  const runtime = loadRuntimeConfig();
  assert.equal(runtime.radars.github.maxItems, 2);
  assert.equal(runtime.radars.podcast.maxItems, 2);
  assert.equal(runtime.radars.github.minScore, 85);
  assert.equal(runtime.radars.podcast.minScore, 85);
});

test('daily card contains third section and sends through poster once', async () => {
  const github = { date: '2026-07-03', summary: 'GitHub', selectedProjects: [] };
  const podcast = { date: '2026-07-03', conclusion: 'none', recommendations: [], pending: [], rejected: [], screening: {} };
  const ai = { date: '2026-07-03', conclusion: 'none', recommendations: [], screening: {} };
  const card = buildDailyCard(github, podcast, ai);
  assert.match(JSON.stringify(card), /AI C端应用与 Codex 生态更新雷达/);
  let calls = 0;
  await sendCardOnce(card, { webhook: 'https://example.com', secret: 'test' }, async () => { calls += 1; return { code: 0 }; });
  assert.equal(calls, 1);
});
