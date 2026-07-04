const assert = require('assert');
global.addEventListener = () => {};
global.importScripts = () => { global.FeedbackRules = require('./feedback-rules'); };
const { parseFeedbackText, handleRequest } = require('../workers/feishu-feedback-worker');

function event(text, token = 'verify-token') { return { schema: '2.0', header: { token, event_id: 'evt-1', event_type: 'im.message.receive_v1' }, event: { sender: { sender_id: { open_id: 'ou-user' } }, message: { message_id: 'om-1', chat_id: 'oc-chat', message_type: 'text', content: JSON.stringify({ text }) } } }; }
function b64(value) { return Buffer.from(JSON.stringify(value)).toString('base64'); }

(async () => {
  assert.deepEqual(parseFeedbackText('反馈 podcast:1fa53f7c 已读不错，原因：Codex 实操有价值'), { feedbackId: 'podcast:1fa53f7c', rawFeedback: '已读不错', feedbackType: 'positive', note: 'Codex 实操有价值' });
  assert.equal(parseFeedbackText('普通聊天消息'), null);
  const env = { FEISHU_VERIFICATION_TOKEN: 'verify-token', GITHUB_TOKEN: 'github-token', GITHUB_REPO: 'teallor/repo', GITHUB_BRANCH: 'main', FEISHU_ALLOWED_CHAT_ID: 'oc-chat' };
  let feedback = { version: 1, updatedAt: null, items: [], summaryMemory: { positiveSignals: [], negativeSignals: [], duplicateSignals: [], allowRepeatSignals: [], lastUpdatedAt: null } };
  const history = { items: [{ feedbackId: 'podcast:1fa53f7c', category: 'podcast', title: 'Codex 实操', url: 'https://example.com/e', firstPushedDate: '2026-07-03', lastPushedDate: '2026-07-04' }] };
  let puts = 0; const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    if (options.method === 'PUT') { puts++; feedback = JSON.parse(Buffer.from(JSON.parse(options.body).content, 'base64').toString()); return new Response(JSON.stringify({ content: { sha: 'new-sha' } }), { status: 200 }); }
    const data = String(url).includes('push-history') ? history : feedback; return new Response(JSON.stringify({ sha: 'sha-1', content: b64(data) }), { status: 200 });
  };
  const response = await handleRequest(new Request('https://worker.example', { method: 'POST', body: JSON.stringify(event('反馈 podcast:1fa53f7c 已读不错，原因：Codex 实操有价值')) }), env);
  assert.equal(response.status, 200); assert.equal((await response.json()).recorded, 'podcast:1fa53f7c'); assert.equal(puts, 1);
  assert.equal(feedback.items[0].source, 'feishu'); assert.equal(feedback.items[0].feedbackType, 'positive'); assert.equal(feedback.items[0].note, 'Codex 实操有价值'); assert.ok(feedback.summaryMemory.positiveSignals.length);
  const ignored = await handleRequest(new Request('https://worker.example', { method: 'POST', body: JSON.stringify(event('今天天气不错')) }), env); assert.equal((await ignored.json()).ignored, 'not_feedback'); assert.equal(puts, 1);
  const denied = await handleRequest(new Request('https://worker.example', { method: 'POST', body: JSON.stringify(event('反馈 podcast:1fa53f7c 重复了', 'wrong')) }), env); assert.equal(denied.status, 401);
  const challenge = await handleRequest(new Request('https://worker.example', { method: 'POST', body: JSON.stringify({ type: 'url_verification', token: 'verify-token', challenge: 'abc' }) }), env); assert.deepEqual(await challenge.json(), { challenge: 'abc' });
  global.fetch = originalFetch;
  console.log('PASS: Feishu event -> parsed feedback -> GitHub Contents API update');
})().catch(error => { console.error(error); process.exit(1); });
