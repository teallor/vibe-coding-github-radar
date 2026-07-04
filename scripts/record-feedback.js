const { loadFeedback, saveFeedback, classifyFeedback, tokenize } = require('./feedback-memory');
const { loadLedger, saveLedger, feedbackIdFor, normalizeUrl } = require('./dedupe');

function argsOf(argv) { const out = {}; for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[++i] || ''; return out; }
function candidatesFor(args, ledger) {
  if (args.id) return ledger.items.filter(x => x.feedbackId === args.id);
  if (args.url) { const url = normalizeUrl(args.url); return ledger.items.filter(x => x.url === url); }
  if (args.title) { const q = args.title.toLowerCase(); return ledger.items.filter(x => String(x.title || '').toLowerCase().includes(q)); }
  return [];
}
function main(argv = process.argv.slice(2), root = process.cwd()) {
  const args = argsOf(argv); if (!args.feedback) throw new Error('必须提供 --feedback。并请用 --id、--url 或 --title 指定内容。');
  const ledger = loadLedger(root); let matches = candidatesFor(args, ledger);
  if (matches.length > 1) { console.log('标题匹配到多个候选，请改用 feedbackId：'); matches.forEach(x => console.log(`- ${x.feedbackId} | ${x.title} | ${x.url || '-'}`)); return { ambiguous: true, matches }; }
  let target = matches[0];
  if (!target && args.id) target = { feedbackId: args.id, category: args.id.split(':')[0], title: args.title || '', url: normalizeUrl(args.url || '') };
  if (!target && args.url) { const category = args.category || 'aiapp'; target = { feedbackId: feedbackIdFor({ url: args.url, title: args.title }, category), category, title: args.title || '', url: normalizeUrl(args.url) }; }
  if (!target) throw new Error('没有找到匹配内容。请先查看 data/push-history.json，或使用准确的 --id。');
  const feedbackType = classifyFeedback(args.feedback); const now = new Date().toISOString(); const data = loadFeedback(root);
  const entry = { feedbackId: target.feedbackId, category: target.category, title: target.title || '', url: target.url || '', firstSeenDate: target.firstPushedDate || now.slice(0, 10), lastPushedDate: target.lastPushedDate || null, feedbackDate: now.slice(0, 10), feedbackType, rawFeedback: args.feedback, note: args.note || '', allowRepeat: feedbackType === 'allow_repeat', source: 'manual', learnedPreference: { preferMoreLikeThis: feedbackType === 'positive', avoidMoreLikeThis: feedbackType === 'negative', keywords: ['positive', 'negative'].includes(feedbackType) ? tokenize(`${target.title || ''} ${args.note || ''}`) : [], negativeSignals: feedbackType === 'negative' ? tokenize(args.note || target.title) : [] } };
  const index = data.items.findIndex(x => x.feedbackId === entry.feedbackId); if (index >= 0) data.items[index] = entry; else data.items.push(entry); saveFeedback(data, root);
  const ledgerEntry = ledger.items.find(x => x.feedbackId === entry.feedbackId); if (ledgerEntry) { ledgerEntry.feedbackType = feedbackType; ledgerEntry.allowRepeat = entry.allowRepeat; } saveLedger(ledger, root);
  console.log(`反馈已记录：${entry.feedbackId} -> ${feedbackType}${feedbackType === 'neutral' ? '（只记录，不改变偏好）' : ''}`); return entry;
}
if (require.main === module) { try { main(); } catch (e) { console.error(e.message); process.exit(1); } }
module.exports = { argsOf, candidatesFor, main };
