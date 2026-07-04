const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { loadFeedback, feedbackFor, preferenceAdjustment } = require('./feedback-memory');

const DEFAULT_LEDGER = () => ({ version: 1, updatedAt: new Date().toISOString(), items: [], decisions: [], migration: { completedAt: null, sources: [] } });
const TRACKING = /^(utm_(source|medium|campaign|term|content)|spm_id_from|fbclid|gclid|yclid|mc_(cid|eid)|ref|referrer|source)$/i;
function normalizeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value); url.hostname = url.hostname.toLowerCase(); url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (TRACKING.test(key)) url.searchParams.delete(key);
    url.searchParams.sort(); url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString().replace(/\/$/, '');
  } catch { return String(value).trim().replace(/\/+$/, ''); }
}
function normalizedText(value) { return String(value || '').toLowerCase().normalize('NFKC').replace(/[\p{P}\p{S}\s]+/gu, ' ').trim(); }
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex').slice(0, 8); }
function categoryOf(item, explicit) {
  if (explicit) return explicit;
  if (item.fullName || /github\.com/i.test(item.url || item.link || '')) return 'github';
  if (item.podcastName || item.durationSeconds || item.duration) return 'podcast';
  return 'aiapp';
}
function feedbackIdFor(item, category) {
  category = categoryOf(item, category);
  if (category === 'github' && item.fullName) return `github:${String(item.fullName).toLowerCase()}`;
  const url = normalizeUrl(item.url || item.link);
  return `${category}:${hash(url || `${normalizedText(item.title || item.name)}|${normalizedText(item.source || item.podcastName)}`)}`;
}
function similarity(a, b) {
  const left = normalizedText(a); const right = normalizedText(b);
  const A = new Set(left.split(' ').filter(Boolean)); const B = new Set(right.split(' ').filter(Boolean));
  const wordScore = A.size && B.size ? [...A].filter(x => B.has(x)).length / Math.max(A.size, B.size) : 0;
  const grams = value => new Set([...value.replace(/\s/g, '')].slice(0, -1).map((x, i, chars) => x + chars[i + 1]));
  const GA = grams(left); const GB = grams(right); const charScore = GA.size && GB.size ? [...GA].filter(x => GB.has(x)).length / Math.max(GA.size, GB.size) : 0;
  return Math.max(wordScore, charScore);
}
function podcastMatch(a, b) {
  if (normalizeUrl(a.url || a.link) && normalizeUrl(a.url || a.link) === normalizeUrl(b.url || b.link)) return { match: 'exact', score: 1 };
  const sameShow = similarity(a.podcastName, b.podcastName) >= 0.75;
  const title = similarity(a.episodeTitle || a.title, b.episodeTitle || b.title);
  const dateClose = !a.publishedAt || !b.publishedAt || String(a.publishedAt).slice(0, 10) === String(b.publishedAt).slice(0, 10);
  const durations = [Number(a.durationSeconds), Number(b.durationSeconds)];
  const durationClose = !durations.every(Number.isFinite) || Math.abs(durations[0] - durations[1]) <= Math.max(120, durations[0] * .08);
  if (sameShow && title >= .8 && dateClose && durationClose) return { match: 'exact', score: title };
  const notes = similarity(a.description || a.shownotes, b.description || b.shownotes);
  if (sameShow && title >= .55 && (dateClose || durationClose || notes >= .45)) return { match: 'possible', score: Math.max(title, notes) };
  return { match: 'none', score: title };
}
function ledgerPath(root = process.cwd()) { return path.join(root, 'data', 'push-history.json'); }
function loadLedger(root = process.cwd(), { create = true } = {}) {
  const file = ledgerPath(root);
  if (!fs.existsSync(file)) { const data = DEFAULT_LEDGER(); if (create) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2)); } console.log('[dedupe] push-history.json 不存在，已初始化空台账。'); return data; }
  try { const data = JSON.parse(fs.readFileSync(file, 'utf8')); const ledger = { ...DEFAULT_LEDGER(), ...data, items: Array.isArray(data.items) ? data.items : [], decisions: Array.isArray(data.decisions) ? data.decisions : [] }; if (!ledger.migration?.completedAt) migrateHistoricalSources(ledger, root); return ledger; }
  catch (e) { console.warn(`[dedupe] push-history.json 无法解析，使用空台账：${e.message}`); return DEFAULT_LEDGER(); }
}
function migrateHistoricalSources(ledger, root = process.cwd()) {
  const sources = ['data/history.json', 'data/latest.json', 'data/codex-podcasts-latest.json', 'data/ai-app-radar-latest.json'];
  const add = (item, category, date) => {
    if (!item) return; const feedbackId = feedbackIdFor(item, category); if (ledger.items.some(x => x.feedbackId === feedbackId)) return;
    ledger.items.push({ feedbackId, category, title: item.title || item.name || item.fullName || '', url: normalizeUrl(item.url || item.link), podcastName: item.podcastName || null, episodeTitle: category === 'podcast' ? item.title : null, publishedAt: item.publishedAt || null, durationSeconds: item.durationSeconds || null, shownotes: String(item.description || item.whyWorthListening || '').slice(0, 500), firstPushedDate: date, lastPushedDate: date, pushCount: 1, migrated: true });
  };
  for (const relative of sources) {
    const file = path.join(root, relative); if (!fs.existsSync(file)) { console.log(`[dedupe] 历史来源缺失，跳过：${relative}`); continue; }
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8')); const date = data.date || String(data.updatedAt || '').slice(0, 10) || null;
      if (relative.endsWith('history.json')) for (const day of data.history || []) { add(day.topPick, 'github', day.date); for (const x of day.selectedProjects || []) add(x, 'github', day.date); }
      else if (relative.endsWith('latest.json') && !relative.includes('podcasts') && !relative.includes('ai-app')) { add(data.topPick, 'github', date); for (const x of data.selectedProjects || []) add(x, 'github', date); }
      else if (relative.includes('podcasts')) for (const x of data.recommendations || []) add(x, 'podcast', date);
      else for (const x of data.recommendations || []) add(x, 'aiapp', date);
      ledger.migration.sources.push(relative);
    } catch (e) { console.warn(`[dedupe] 历史来源读取失败，跳过 ${relative}: ${e.message}`); }
  }
  const reportDir = path.join(root, 'reports');
  if (fs.existsSync(reportDir)) {
    const reports = fs.readdirSync(reportDir).filter(x => x.endsWith('.md'));
    ledger.migration.sources.push(`reports/*.md (${reports.length} files inspected; structured records take precedence)`);
  } else console.log('[dedupe] reports/ 不存在，跳过 Markdown 历史检查。');
  ledger.migration.completedAt = new Date().toISOString(); saveLedger(ledger, root);
  console.log(`[dedupe] 历史迁移完成：${ledger.items.length} 条；来源=${ledger.migration.sources.join(', ')}`);
}
function findHistory(item, category, ledger) {
  const id = feedbackIdFor(item, category); const exact = ledger.items.find(x => x.feedbackId === id);
  if (exact) return { item: exact, match: 'exact' };
  if (category === 'podcast') {
    let possible = null;
    for (const old of ledger.items.filter(x => x.category === 'podcast')) { const result = podcastMatch(item, old); if (result.match === 'exact') return { item: old, match: 'exact' }; if (result.match === 'possible') possible = { item: old, match: 'possible' }; }
    return possible;
  }
  return null;
}
function decisionFor(item, category, ledger, feedbackData) {
  const id = feedbackIdFor(item, category); const found = findHistory(item, category, ledger); const previous = found?.item || null;
  const feedback = feedbackFor(feedbackData, previous?.feedbackId || id); const pref = preferenceAdjustment(item, feedbackData);
  let decision = 'allow_new', reason = 'never_pushed', annotation = '', scoreDelta = pref.scoreDelta;
  if (found?.match === 'possible') { decision = 'allow_possible_duplicate'; reason = 'possible_duplicate'; scoreDelta -= 5; annotation = `⚠️ 疑似重复：可能与 ${previous.firstPushedDate} 推送内容相同，已降权并保留提示。`; }
  else if (previous) {
    if (feedback?.feedbackType === 'allow_repeat' || feedback?.allowRepeat) { decision = 'allow_repeat'; reason = 'explicit_allow_repeat'; scoreDelta -= 2; annotation = `🔁 追踪更新：这条内容曾于 ${previous.firstPushedDate} 推送过；你此前反馈允许继续追踪，因此本次继续推荐。`; }
    else if (feedback?.feedbackType) { decision = 'blocked'; reason = `already_pushed_with_${feedback.feedbackType}_feedback`; }
    else { decision = 'allow_unanswered_repeat'; reason = 'already_pushed_without_feedback'; scoreDelta -= 10; annotation = `⚠️ 重复推送：这条内容曾于 ${previous.firstPushedDate} 推送过；目前没有收到任何反馈，因此本次允许重复出现。请反馈“已读不错 / 已读不行 / 重复了”，后续系统将据此处理。`; }
  }
  return { feedbackId: previous?.feedbackId || id, category, decision, reason, allowed: decision !== 'blocked', duplicateStatus: previous ? (found.match === 'possible' ? 'possible' : 'repeat') : 'new', firstPushedDate: previous?.firstPushedDate || null, lastPushedDate: previous?.lastPushedDate || null, feedbackType: feedback?.feedbackType || null, hasFeedback: Boolean(feedback), scoreDelta, annotation };
}
function enrichAndFilter(items, category, { root = process.cwd(), maxItems = Infinity } = {}) {
  const ledger = loadLedger(root); const feedback = loadFeedback(root); const decisions = [];
  const enriched = items.map(item => { const d = decisionFor(item, category, ledger, feedback); decisions.push({ feedbackId: d.feedbackId, title: item.title || item.name, ...d }); return { ...item, ...d, preferenceScoreDelta: d.scoreDelta }; })
    .filter(item => item.allowed).sort((a, b) => ((b.score || b.qualityScore || b.recommendScore || 0) + b.scoreDelta) - ((a.score || a.qualityScore || a.recommendScore || 0) + a.scoreDelta)).slice(0, maxItems);
  ledger.decisions = [...ledger.decisions.filter(x => x.date !== new Date().toISOString().slice(0, 10)), ...decisions.map(x => ({ ...x, date: new Date().toISOString().slice(0, 10) }))].slice(-1000); saveLedger(ledger, root);
  for (const d of decisions) console.log(`[dedupe] ${d.feedbackId} ${d.decision}: ${d.reason}`);
  return { items: enriched, decisions };
}
function recordPushed(items, category, root = process.cwd(), sentAt = new Date()) {
  const ledger = loadLedger(root); const date = sentAt.toISOString().slice(0, 10);
  for (const item of items) {
    const id = item.feedbackId || feedbackIdFor(item, category); let entry = ledger.items.find(x => x.feedbackId === id);
    const snapshot = { feedbackId: id, category, title: item.title || item.name, url: normalizeUrl(item.url || item.link), podcastName: item.podcastName || null, episodeTitle: category === 'podcast' ? item.title : null, publishedAt: item.publishedAt || null, durationSeconds: item.durationSeconds || null, shownotes: String(item.description || '').slice(0, 500), firstPushedDate: entry?.firstPushedDate || date, lastPushedDate: date, pushCount: (entry?.pushCount || 0) + 1, lastDecision: item.decision || 'allow_new', feedbackType: item.feedbackType || entry?.feedbackType || null };
    if (entry) Object.assign(entry, snapshot); else ledger.items.push(snapshot);
  }
  saveLedger(ledger, root); return ledger;
}
function saveLedger(data, root = process.cwd()) { const file = ledgerPath(root); fs.mkdirSync(path.dirname(file), { recursive: true }); data.updatedAt = new Date().toISOString(); fs.writeFileSync(file, JSON.stringify(data, null, 2)); return file; }

module.exports = { DEFAULT_LEDGER, normalizeUrl, normalizedText, feedbackIdFor, similarity, podcastMatch, loadLedger, saveLedger, migrateHistoricalSources, findHistory, decisionFor, enrichAndFilter, recordPushed };
