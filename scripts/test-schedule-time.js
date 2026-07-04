const assert = require('assert'); const fs = require('fs'); const path = require('path');
const { TARGET, WORKFLOW_START, targetForShanghaiDay, workflowStartForShanghaiDay, formatTime, delayMinutes, delayDiagnostic, shouldWaitForTarget, waitUntilTarget } = require('./time-utils');

(async () => {
  assert.equal(TARGET.timezone, 'Asia/Shanghai');
  assert.equal(`${String(WORKFLOW_START.hour).padStart(2, '0')}:${WORKFLOW_START.minute}`, '06:20');
  assert.equal(`${String(TARGET.hour).padStart(2, '0')}:${TARGET.minute}`, '06:45');
  const target = targetForShanghaiDay(new Date('2026-07-04T00:00:00Z'));
  assert.equal(target.toISOString(), '2026-07-03T22:45:00.000Z');
  assert.equal(workflowStartForShanghaiDay(new Date('2026-07-04T00:00:00Z')).toISOString(), '2026-07-03T22:20:00.000Z');
  const formatted = formatTime(target); assert.match(formatted.utc, /22:45/); assert.match(formatted.shanghai, /06:45/);
  assert.equal(delayMinutes(new Date('2026-07-03T23:00:00Z')), 15);
  const late = delayDiagnostic(new Date('2026-07-03T23:11:00Z'), { GITHUB_EVENT_NAME: 'schedule', WORKFLOW_STARTED_AT: '2026-07-03T22:30:00Z' }); assert.match(late.warning, /延迟 26 分钟/); assert.match(late.causeText, /晚启动 10 分钟/);
  const lateStart = delayDiagnostic(new Date('2026-07-03T22:52:00Z'), { GITHUB_EVENT_NAME: 'schedule', WORKFLOW_STARTED_AT: '2026-07-03T22:50:00Z' }); assert.match(lateStart.warning, /在目标 06:45 之后才启动/);
  const severe = delayDiagnostic(new Date('2026-07-03T23:31:00Z'), { GITHUB_EVENT_NAME: 'schedule' }); assert.match(severe.reportAnomaly, /调度异常记录/);
  const manual = delayDiagnostic(new Date('2026-07-03T23:31:00Z'), { GITHUB_EVENT_NAME: 'workflow_dispatch' }); assert.equal(manual.warning, ''); assert.match(manual.label, /手动运行/);
  assert.equal(shouldWaitForTarget({ GITHUB_EVENT_NAME: 'schedule' }), true);
  assert.equal(shouldWaitForTarget({ GITHUB_EVENT_NAME: 'workflow_dispatch' }), false);
  assert.equal(shouldWaitForTarget({ GITHUB_EVENT_NAME: 'workflow_dispatch', WAIT_UNTIL_TARGET: 'true' }), true);
  assert.equal(shouldWaitForTarget({ GITHUB_EVENT_NAME: 'schedule', FEISHU_DRY_RUN: '1' }), false);
  let slept = 0; const times = [new Date('2026-07-03T22:20:00Z'), new Date('2026-07-03T22:45:00Z')];
  const waited = await waitUntilTarget({ env: { GITHUB_EVENT_NAME: 'schedule' }, now: () => times.shift(), sleep: async ms => { slept = ms; } });
  assert.equal(waited.waited, true); assert.equal(slept, 25 * 60 * 1000);
  let lateSleep = false; const immediate = await waitUntilTarget({ env: { GITHUB_EVENT_NAME: 'schedule' }, now: () => new Date('2026-07-03T22:50:00Z'), sleep: async () => { lateSleep = true; } });
  assert.equal(immediate.reason, 'target_already_passed'); assert.equal(lateSleep, false);
  const workflow = fs.readFileSync(path.join(process.cwd(), '.github', 'workflows', 'daily-scout.yml'), 'utf8');
  assert.match(workflow, /cron: "20 22 \* \* \*"/); assert.match(workflow, /time-utils\.js --workflow/); assert.match(workflow, /GITHUB_EVENT_NAME/); assert.match(workflow, /WAIT_UNTIL_TARGET/);
  console.log('PASS: schedule/time early-generation and target-send scenarios');
})().catch(error => { console.error(error); process.exit(1); });
