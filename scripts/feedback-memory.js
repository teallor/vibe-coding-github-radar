const fs = require('fs');
const path = require('path');
const { classifyFeedback, tokenize } = require('./feedback-rules');

const DEFAULT_FEEDBACK = () => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  items: [],
  summaryMemory: { positiveSignals: [], negativeSignals: [], duplicateSignals: [], allowRepeatSignals: [], lastUpdatedAt: null }
});

function feedbackPath(root = process.cwd()) { return path.join(root, 'data', 'feedback.json'); }

function loadFeedback(root = process.cwd(), { create = true } = {}) {
  const file = feedbackPath(root);
  if (!fs.existsSync(file)) {
    const data = DEFAULT_FEEDBACK();
    if (create) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
    console.log('[feedback] data/feedback.json 不存在，已使用空反馈记忆。');
    return data;
  }
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...DEFAULT_FEEDBACK(), ...data, items: Array.isArray(data.items) ? data.items : [] };
  } catch (error) {
    console.warn(`[feedback] feedback.json 无法解析，已使用空反馈记忆：${error.message}`);
    return DEFAULT_FEEDBACK();
  }
}

function rebuildSummary(data) {
  const summary = { positiveSignals: [], negativeSignals: [], duplicateSignals: [], allowRepeatSignals: [], lastUpdatedAt: new Date().toISOString() };
  const add = (key, values) => { summary[key] = [...new Set([...summary[key], ...values])].slice(-40); };
  for (const item of data.items) {
    const signals = item.learnedPreference?.keywords || tokenize(`${item.title || ''} ${item.note || ''}`);
    if (item.feedbackType === 'positive') add('positiveSignals', signals);
    if (item.feedbackType === 'negative') add('negativeSignals', signals);
    if (item.feedbackType === 'duplicate') add('duplicateSignals', [item.feedbackId].filter(Boolean));
    if (item.feedbackType === 'allow_repeat') add('allowRepeatSignals', [item.feedbackId].filter(Boolean));
  }
  data.summaryMemory = summary;
  return data;
}

function saveFeedback(data, root = process.cwd()) {
  const file = feedbackPath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  data.version = 1; data.updatedAt = new Date().toISOString(); rebuildSummary(data);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

function feedbackFor(data, feedbackId) {
  return [...(data.items || [])].reverse().find(item => item.feedbackId === feedbackId) || null;
}

function feedbackSummaryText(data) {
  if (!(data.items || []).some(item => item.feedbackType !== 'neutral')) return '';
  const s = data.summaryMemory || rebuildSummary(data).summaryMemory;
  const lines = ['用户历史反馈摘要：'];
  if (s.positiveSignals.length) lines.push(`- 用户明确喜欢：${s.positiveSignals.join('、')}。`);
  if (s.negativeSignals.length) lines.push(`- 用户明确不喜欢：${s.negativeSignals.join('、')}。`);
  lines.push('- 重复规则：已有反馈的旧内容默认不再推；只有无反馈旧内容才可低优先级重复并标注。');
  lines.push('- negative / duplicate 内容不得再次推荐；allow_repeat 可继续追踪但必须标注。');
  lines.push('如果没有足够高质量内容，宁可少推或不推，不要凑数量。');
  return lines.join('\n');
}

function preferenceAdjustment(candidate, data) {
  const text = tokenize(`${candidate.title || candidate.name || ''} ${candidate.description || ''}`);
  const positive = data.summaryMemory?.positiveSignals || [];
  const negative = data.summaryMemory?.negativeSignals || [];
  const pos = text.filter(token => positive.includes(token)).length;
  const neg = text.filter(token => negative.includes(token)).length;
  return { scoreDelta: Math.min(3, pos) - Math.min(8, neg * 2), positiveMatches: pos, negativeMatches: neg };
}

module.exports = { DEFAULT_FEEDBACK, loadFeedback, saveFeedback, classifyFeedback, rebuildSummary, feedbackFor, feedbackSummaryText, preferenceAdjustment, tokenize };
