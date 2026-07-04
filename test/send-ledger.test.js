const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { EMPTY_LEDGER, loadSendLedger, messageDigest, evaluateSend, recordSend } = require('../scripts/send-ledger');

test('same-day successful send blocks schedule and manual unless forced', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'send-ledger-')); const when = new Date('2026-07-03T22:45:12Z');
  recordSend({ status: 'sent', trigger: 'schedule', runId: 'run-1', digest: 'abc', date: when }, root);
  const ledger = loadSendLedger(root);
  assert.equal(evaluateSend({ ledger, date: '2026-07-04' }).allowed, false);
  assert.equal(evaluateSend({ ledger, date: '2026-07-04', force: true }).allowed, true);
});

test('failed send remains retryable and dry-run is never allowed to send', () => {
  const ledger = EMPTY_LEDGER(); ledger.entries.push({ date: '2026-07-04', status: 'failed' });
  assert.equal(evaluateSend({ ledger, date: '2026-07-04' }).allowed, true);
  assert.equal(evaluateSend({ ledger, date: '2026-07-04', force: true, dryRun: true }).allowed, false);
  assert.equal(evaluateSend({ ledger, date: '2026-07-04', dryRun: true }).reason, 'dry_run_never_sends');
});

test('success ledger contains required audit fields and stable digest', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'send-ledger-')); const card = { header: { title: 'daily' } };
  assert.equal(messageDigest(card), messageDigest(card));
  const entry = recordSend({ status: 'sent', trigger: 'workflow_dispatch', runId: '42', digest: messageDigest(card), force: true, date: new Date('2026-07-03T22:45:12Z') }, root);
  assert.deepEqual({ date: entry.date, target: entry.targetSendTime, actual: entry.actualSendTime, status: entry.status, trigger: entry.trigger, runId: entry.runId }, { date: '2026-07-04', target: '06:45', actual: '06:45:12', status: 'sent', trigger: 'workflow_dispatch', runId: '42' });
});

test('workflow exposes force input, serializes runs, and commits the ledger', () => {
  const workflow = fs.readFileSync('.github/workflows/daily-scout.yml', 'utf8');
  assert.match(workflow, /force_send:/); assert.match(workflow, /FORCE_SEND:/);
  assert.match(workflow, /group: daily-feishu-send/); assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /data\/send-ledger\.json/); assert.match(workflow, /if: always\(\) && !cancelled\(\)/);
});
