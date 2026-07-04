const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const EMPTY_LEDGER = () => ({ version: 1, updatedAt: new Date().toISOString(), entries: [] });
function ledgerPath(root = process.cwd()) { return path.join(root, 'data', 'send-ledger.json'); }
function shanghaiDate(date = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); }
function shanghaiTime(date = new Date()) { return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(date); }
function loadSendLedger(root = process.cwd()) {
  const file = ledgerPath(root); if (!fs.existsSync(file)) return EMPTY_LEDGER();
  try { const data = JSON.parse(fs.readFileSync(file, 'utf8')); return { ...EMPTY_LEDGER(), ...data, entries: Array.isArray(data.entries) ? data.entries : [] }; }
  catch (error) { throw new Error(`send-ledger.json 无法解析，为避免重复发送已停止：${error.message}`); }
}
function saveSendLedger(ledger, root = process.cwd()) { const file = ledgerPath(root); fs.mkdirSync(path.dirname(file), { recursive: true }); ledger.updatedAt = new Date().toISOString(); fs.writeFileSync(file, JSON.stringify(ledger, null, 2)); return file; }
function messageDigest(card) { return crypto.createHash('sha256').update(JSON.stringify(card)).digest('hex').slice(0, 16); }
function evaluateSend({ ledger, date = shanghaiDate(), force = false, dryRun = false }) {
  if (dryRun) return { allowed: false, reason: 'dry_run_never_sends', previous: null };
  const previous = [...(ledger.entries || [])].reverse().find(entry => entry.date === date && entry.status === 'sent') || null;
  if (previous && !force) return { allowed: false, reason: 'already_sent_today', previous };
  return { allowed: true, reason: previous ? 'forced_repeat_send' : 'not_sent_today', previous };
}
function recordSend({ status, trigger, runId, digest, error, force = false, date = new Date() }, root = process.cwd()) {
  const ledger = loadSendLedger(root); const entry = { date: shanghaiDate(date), targetSendTime: '06:45', actualSendTime: shanghaiTime(date), actualSendAt: date.toISOString(), status, trigger: trigger || 'local', runId: runId || null, messageDigest: digest, forced: Boolean(force) };
  if (error) entry.error = String(error).slice(0, 500);
  ledger.entries.push(entry); ledger.entries = ledger.entries.slice(-180); saveSendLedger(ledger, root); return entry;
}
module.exports = { EMPTY_LEDGER, ledgerPath, shanghaiDate, shanghaiTime, loadSendLedger, saveSendLedger, messageDigest, evaluateSend, recordSend };
