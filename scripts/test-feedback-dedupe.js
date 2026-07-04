const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { feedbackIdFor, podcastMatch, loadLedger, saveLedger, decisionFor } = require('./dedupe');
const { DEFAULT_FEEDBACK, loadFeedback, saveFeedback } = require('./feedback-memory');
function root() { const r = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-test-')); fs.mkdirSync(path.join(r, 'data')); return r; }
function fixture(type) { const r = root(); const item = { title: 'Codex 实操', link: 'https://example.com/episode?utm_source=x', podcastName: 'AI Podcast', publishedAt: '2026-07-01', durationSeconds: 1800, description: 'Codex workflow shownotes' }; const id = feedbackIdFor(item, 'podcast'); const ledger = loadLedger(r); ledger.items.push({ ...item, feedbackId: id, category: 'podcast', firstPushedDate: '2026-07-01', lastPushedDate: '2026-07-01' }); saveLedger(ledger, r); const feedback = DEFAULT_FEEDBACK(); if (type) feedback.items.push({ feedbackId: id, feedbackType: type, allowRepeat: type === 'allow_repeat' }); saveFeedback(feedback, r); return { r, item, id, ledger: loadLedger(r), feedback: loadFeedback(r) }; }

{ const r = root(); const item = { title: 'New', link: 'https://new.example/a' }; const d = decisionFor(item, 'aiapp', loadLedger(r), loadFeedback(r)); assert.equal(d.decision, 'allow_new'); }
{ const x = fixture(); const d = decisionFor(x.item, 'podcast', x.ledger, x.feedback); assert.equal(d.decision, 'allow_unanswered_repeat'); assert.match(d.annotation, /重复推送/); }
for (const type of ['positive', 'negative', 'duplicate']) { const x = fixture(type); assert.equal(decisionFor(x.item, 'podcast', x.ledger, x.feedback).allowed, false, type); }
{ const x = fixture('allow_repeat'); const d = decisionFor(x.item, 'podcast', x.ledger, x.feedback); assert.equal(d.allowed, true); assert.match(d.annotation, /追踪更新/); }
{ const a = { podcastName: 'AI Podcast', title: 'Codex 从入门到实战', link: 'https://xiaoyuzhou.example/a', publishedAt: '2026-07-01', durationSeconds: 2400, description: '完整 Codex 工作流' }; const b = { ...a, link: 'https://apple.example/b' }; assert.notEqual(podcastMatch(a, b).match, 'none'); }
{ const a = { podcastName: 'AI Podcast', title: 'Codex 从入门到实战', publishedAt: '2026-07-01', durationSeconds: 2400 }; const b = { ...a, title: 'MCP 插件开发进阶', publishedAt: '2026-07-02' }; assert.equal(podcastMatch(a, b).match, 'none'); }
{ const r = root(); assert.doesNotThrow(() => loadFeedback(r)); fs.rmSync(path.join(r, 'data', 'feedback.json')); assert.doesNotThrow(() => loadFeedback(r)); }
{ const r = root(); assert.doesNotThrow(() => loadLedger(r)); fs.rmSync(path.join(r, 'data', 'push-history.json')); assert.doesNotThrow(() => loadLedger(r)); }
console.log('PASS: feedback/dedupe 10 scenarios');
