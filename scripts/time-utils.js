const { formatDiagnostic } = require('./error-categories');
const TARGET = { timezone: 'Asia/Shanghai', hour: 6, minute: 45 };
const WORKFLOW_START = { timezone: 'Asia/Shanghai', hour: 6, minute: 20 };
function parts(date, timeZone = TARGET.timezone) { return Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).filter(x => x.type !== 'literal').map(x => [x.type, x.value])); }
function targetForShanghaiDay(date = new Date()) { const p = parts(date); return new Date(Date.UTC(+p.year, +p.month - 1, +p.day - 1, 22, 45, 0)); }
function workflowStartForShanghaiDay(date = new Date()) { const p = parts(date); return new Date(Date.UTC(+p.year, +p.month - 1, +p.day - 1, 22, 20, 0)); }
function delayMinutes(date = new Date()) { return Math.floor((date - targetForShanghaiDay(date)) / 60000); }
function formatTime(date = new Date()) { const p = parts(date); return { iso: date.toISOString(), utc: `${date.toISOString().replace('T', ' ').replace('.000Z', 'Z')}`, shanghai: `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} Asia/Shanghai`, chinese: `${p.year}年${p.month}月${p.day}日 ${p.hour}:${p.minute}:${p.second}（北京时间）` }; }
function logTime(label, date = new Date()) { const f = formatTime(date); console.log(`[time] ${label} | ISO=${f.iso} | UTC=${f.utc} | Asia/Shanghai=${f.shanghai} | 中文=${f.chinese}`); return f; }
function triggerContext(env = process.env) { return { event: env.GITHUB_EVENT_NAME || 'local', isScheduled: env.GITHUB_EVENT_NAME === 'schedule', scheduledAt: env.SCHEDULED_AT ? new Date(env.SCHEDULED_AT) : null, workflowStartedAt: env.WORKFLOW_STARTED_AT ? new Date(env.WORKFLOW_STARTED_AT) : null }; }
function shouldWaitForTarget(env = process.env) { return env.FEISHU_DRY_RUN !== '1' && (env.GITHUB_EVENT_NAME === 'schedule' || /^(1|true|yes)$/i.test(env.WAIT_UNTIL_TARGET || '')); }
async function waitUntilTarget(options = {}) {
  const env = options.env || process.env; const now = options.now || (() => new Date()); const sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const started = now(); const target = targetForShanghaiDay(started); const waitMs = target - started;
  if (!shouldWaitForTarget(env)) { console.log('[time] 不等待 06:45：手动/本地运行默认立即发送。'); return { waited: false, waitMs: 0, target, reason: 'wait_not_requested' }; }
  if (waitMs <= 0) { console.log(`[time] 已到或超过目标发送时间，不再等待；晚 ${Math.ceil(Math.abs(waitMs) / 60000)} 分钟。`); return { waited: false, waitMs: 0, target, reason: 'target_already_passed' }; }
  logTime('内容已生成，开始等待目标发送时间', started); logTime('目标飞书发送时间', target);
  console.log(`[time] 等待 ${Math.ceil(waitMs / 1000)} 秒后发送飞书。`); await sleep(waitMs);
  logTime('等待结束，准备发送飞书', now()); return { waited: true, waitMs, target, reason: 'waited_until_target' };
}
function delayDiagnostic(date = new Date(), env = process.env) {
  const ctx = triggerContext(env); const target = targetForShanghaiDay(date); const delay = delayMinutes(date);
  if (!ctx.isScheduled) return { ...ctx, delayMinutes: delay, cause: 'manual_run', causeText: '手动运行，不执行每日定时延迟告警', warning: '', reportAnomaly: '', label: '手动运行：不执行每日定时延迟告警' };
  const plannedStart = workflowStartForShanghaiDay(date);
  const startDelayMinutes = ctx.workflowStartedAt ? Math.max(0, Math.floor((ctx.workflowStartedAt - plannedStart) / 60000)) : null;
  const startedAfterTarget = ctx.workflowStartedAt && ctx.workflowStartedAt > target;
  const cause = startedAfterTarget ? 'github_actions_started_after_target' : delay > 0 && startDelayMinutes > 0 ? 'github_actions_start_delay_and_generation' : delay > 0 ? 'content_generation_overrun' : 'on_time';
  const causeText = startedAfterTarget ? `GitHub Actions 比计划 06:20 晚启动 ${startDelayMinutes} 分钟，且在目标 06:45 之后才启动` : delay > 0 && startDelayMinutes > 0 ? `GitHub Actions 比计划 06:20 晚启动 ${startDelayMinutes} 分钟，内容生成完成时已超过目标` : delay > 0 ? '内容生成耗时超过预留窗口' : '内容提前生成并等候至目标时间';
  const p = parts(date); const actual = `${p.hour}:${p.minute}`;
  const warning = (startedAfterTarget || delay > 25) ? `⚠️ 今日推送延迟：目标 06:45，实际 ${actual}，延迟 ${Math.max(0, delay)} 分钟。原因：${causeText}。请到 GitHub Actions 查看运行日志。` : '';
  return { ...ctx, delayMinutes: delay, startDelayMinutes, cause, causeText, warning, reportAnomaly: delay > 45 ? `调度异常记录：目标 06:45，实际 ${actual}，延迟 ${delay} 分钟；原因：${causeText}。请结合 workflow actual start 与内容生成耗时定位。` : '', label: delay <= 25 ? `定时运行：延迟 ${Math.max(0, delay)} 分钟（可接受区间）；${causeText}` : `定时运行：延迟 ${delay} 分钟；${causeText}` };
}
async function logWorkflowTimes(env = process.env) {
  logTime('workflow scheduled time', workflowStartForShanghaiDay(new Date()));
  logTime('target Feishu send time', targetForShanghaiDay(new Date()));
  if (env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID && env.GITHUB_TOKEN) {
    try {
      const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`, { headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'daily-radar-time-diagnostics' } });
      const run = await response.json();
      if (run.created_at) logTime('workflow actual start time', new Date(run.created_at));
      if (run.run_started_at) logTime('workflow job start time', new Date(run.run_started_at));
    } catch (e) { console.warn(`[time] 无法读取 Actions 运行元数据：${e.message}`); console.warn(formatDiagnostic('SCHEDULE_RUNTIME_FAILURE', e)); }
  }
  logTime('workflow job start time (local marker)', new Date());
}
if (require.main === module) {
  const label = process.argv.slice(2).join(' ') || 'time marker';
  (label === '--workflow' ? logWorkflowTimes() : Promise.resolve(logTime(label))).catch(e => { console.error(e.message); process.exit(1); });
}
module.exports = { TARGET, WORKFLOW_START, parts, targetForShanghaiDay, workflowStartForShanghaiDay, delayMinutes, formatTime, logTime, triggerContext, shouldWaitForTarget, waitUntilTarget, delayDiagnostic, logWorkflowTimes };
