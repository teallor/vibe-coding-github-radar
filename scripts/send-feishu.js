/** Push data/latest.json to a signed Feishu custom-bot webhook. */
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const { dailyReportFilename, writeDailyReport } = require('./daily-report');
const { logTime, delayDiagnostic, triggerContext, waitUntilTarget } = require('./time-utils');
const { recordPushed, loadLedger, decisionFor } = require('./dedupe');
const { loadFeedback } = require('./feedback-memory');
const { loadSendLedger, messageDigest, evaluateSend, recordSend } = require('./send-ledger');

const REPOSITORY = process.env.GITHUB_REPOSITORY || 'teallor/vibe-coding-github-radar';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function sign(timestamp, secret) {
  const key = `${timestamp}\n${secret}`;
  return crypto.createHmac('sha256', key).update('').digest('base64');
}

function compact(text, maxLength = 180) {
  const clean = String(text || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean;
}

function projectBlock(project, label) {
  const dimensions = (project.scoreBasis && project.scoreBasis.dimensions) || [];
  const scoring = dimensions.map(d => `${d.label} ${d.score}/${d.max}`).join(' · ');
  const adjustments = [
    ...(project.bonuses || []).map(item => `加分：${item}`),
    ...(project.penalties || []).map(item => `扣分：${item}`)
  ].join('；') || '无额外加扣分';
  const signals = (project.qualityGate && project.qualityGate.relevanceSignals || []).join('、');
  return {
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `**${label}：[${project.name}](${project.url}) · ${project.recommendScore || 0}/100**\n${compact(project.description, 120)}\n**最终评审：** ${project.reviewProvider === 'vertex' ? 'Gemini 3.1 Pro 语义评审' : '规则降级评审'}\n**评分依据：** ${scoring}\n**强相关信号：** ${signals}\n**调整项：** ${adjustments}\n**入选理由：** ${compact(project.vibeCodingValue, 100)}\n**风险：** ${project.riskPoints}${feedbackMeta(project)}`
    }
  };
}

function buildCard(data) {
  const filename = `${data.date}_VibeCoding_GitHub学习日报.md`;
  const reportUrl = `https://github.com/${REPOSITORY}/blob/main/reports/${encodeURIComponent(filename)}`;
  const elements = [
    {
      tag: 'div',
      text: { tag: 'lark_md', content: `**今日结论**\n${compact(data.summary, 260)}` }
    }
  ];

  if (data.topPick) elements.push(projectBlock(data.topPick, '今日最值得精读'));
  for (const project of (data.selectedProjects || []).slice(0, 2)) {
    elements.push({ tag: 'hr' }, projectBlock(project, '精选项目'));
  }
  elements.push(
    { tag: 'hr' },
    {
      tag: 'action',
      actions: [{ tag: 'button', text: { tag: 'plain_text', content: '查看完整 GitHub 日报' }, url: reportUrl, type: 'primary' }]
    },
    { tag: 'note', elements: [{ tag: 'plain_text', content: `由 ${REPOSITORY} 全自动生成并推送` }] }
  );

  return {
    config: { wide_screen_mode: true },
    header: {
      template: 'blue',
      title: { tag: 'plain_text', content: `${data.date} Vibe Coding GitHub 雷达` }
    },
    elements
  };
}

function podcastBlock(item, index) {
  const outline = (item.outline || []).slice(0, 5).map(point => `- ${compact(point, 220)}`).join('\n');
  return {
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `**【第 ${index + 1} 条】${compact(item.podcastName, 80)}｜${compact(item.title, 120)}**\n` +
        `链接：[打开单集](${item.link})\n时长：${item.duration}\n发布日期：${item.publishedAt}\n` +
        `质量评分：**${item.qualityScore}/100**\n最终评审：${item.reviewProvider === 'vertex' ? 'Gemini 3.1 Pro 语义评审' : '规则降级评审'}\nCodex 相关性：${compact(item.codexRelevance, 240)}\n` +
        `**内容大纲：**\n${outline}\n**为什么值得听：**\n${compact(item.whyWorthListening, 500)}\n` +
        `**自检结论：${item.conclusion}**${feedbackMeta(item)}`
    }
  };
}

function buildPodcastCard(data) {
  const recommendations = data.recommendations || [];
  const screening = data.screening || {};
  const elements = [{ tag: 'div', text: { tag: 'lark_md', content: `**今日结论：**\n- ${data.conclusion}` } }];
  recommendations.forEach((item, index) => elements.push({ tag: 'hr' }, podcastBlock(item, index)));
  const failureSummary = (screening.sourceFailures || []).length
    ? `存在 ${(screening.sourceFailures || []).length} 个无法访问或解析的来源，详情见 Actions 日志与运行产物。`
    : '本次没有来源访问或解析失败。';
  elements.push(
    { tag: 'hr' },
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**今日筛选说明：**\n- 搜索来源：${(screening.sources || []).join('；')}\n` +
          `- 候选单集：${screening.candidateCount || 0} 条；待人工确认：${(data.pending || []).length} 条；淘汰：${(data.rejected || []).length} 条\n` +
          `- 排除类型：${(screening.excluded || []).join('；')}\n- ${failureSummary}`
      }
    },
    { tag: 'note', elements: [{ tag: 'plain_text', content: `严格按 RSS 正文证据筛选；宁缺毋滥。由 ${REPOSITORY} 自动生成。` }] }
  );
  return {
    config: { wide_screen_mode: true },
    header: { template: recommendations.length ? 'green' : 'grey', title: { tag: 'plain_text', content: `【Codex 中文播客雷达】${data.date}` } },
    elements
  };
}

function buildCombinedCard(githubData, podcastData) {
  const githubCard = buildCard(githubData);
  const podcastCard = buildPodcastCard(podcastData);
  return {
    config: { wide_screen_mode: true },
    header: {
      template: 'blue',
      title: { tag: 'plain_text', content: `${podcastData.date} Vibe Coding GitHub + Codex 播客雷达` }
    },
    elements: [
      { tag: 'div', text: { tag: 'lark_md', content: '**第一部分｜Vibe Coding GitHub 雷达**' } },
      ...githubCard.elements,
      { tag: 'hr' },
      { tag: 'div', text: { tag: 'lark_md', content: '**第二部分｜OpenAI Codex 高质量中文播客雷达**' } },
      ...podcastCard.elements
    ]
  };
}

function feedbackMeta(item) {
  const repeat = item.duplicateStatus === 'new' ? '否' : item.duplicateStatus === 'possible' ? '疑似重复' : '是';
  return `\n**反馈ID：** ${item.feedbackId || '未生成'}\n**重复：** ${repeat}；首次：${item.firstPushedDate || '本次'}；上次：${item.lastPushedDate || '无'}；已有反馈：${item.hasFeedback ? item.feedbackType : '否'}\n**本次允许原因：** ${item.reason || '新内容'}${item.annotation ? `\n${item.annotation}` : ''}\n反馈方式：直接回复“反馈 ${item.feedbackId || ''} 已读不错 / 已读不行 / 重复了 / 允许继续追踪，原因：……”。如未启用飞书自动反馈，请把这句话发给 Codex 录入。`;
}

function refreshDecisions(items, category) {
  const ledger = loadLedger(); const feedback = loadFeedback();
  return items.map(item => ({ ...item, ...decisionFor(item, category, ledger, feedback) })).filter(item => item.allowed);
}

function aiAppBlock(item, index) {
  const extra = ['Codex', 'Skill', 'MCP', '插件'].includes(item.type)
    ? `\n**适合解决的问题：** ${compact(item.suitableProblem, 260)}\n**使用门槛：** ${compact(item.usageBarrier, 200)}\n**是否需要 API Key / Token：** ${compact(item.requiresApiKey, 100)}\n**是否适合小白：** ${compact(item.beginnerFriendly, 120)}\n**是否值得保存到工具库：** ${compact(item.saveToToolkit, 120)}`
    : '';
  return { tag: 'div', text: { tag: 'lark_md', content:
    `**【${index + 1}】[${compact(item.title, 120)}](${item.link})**\n` +
    `**类型：** ${item.type}\n**来源：** ${compact(item.source, 100)}\n**发生了什么：** ${compact(item.whatHappened, 420)}\n` +
    `**C端用户能怎么用：** ${compact(item.consumerUseCase, 300)}\n**对 Rafael_Huang 的价值：** ${compact(item.valueForRafael, 300)}\n` +
    `**是否适合 Codex 集成或复现：** ${compact(item.codexIntegrationPotential, 260)}\n**行动建议：** ${compact(item.actionSuggestion, 220)}\n` +
    `**质量评分：${item.score}/100**（${item.reviewProvider === 'rules' ? '规则降级评分' : 'Gemini 二次评审'}）${extra}${feedbackMeta(item)}` } };
}

function buildDailyCard(githubData, podcastData, aiAppData, timing = {}) {
  const date = aiAppData.date || podcastData.date || githubData.date;
  const combinedReportUrl = `https://github.com/${REPOSITORY}/blob/main/reports/${encodeURIComponent(dailyReportFilename(date))}`;
  const githubCard = buildCard(githubData);
  const podcastCard = buildPodcastCard(podcastData);
  const aiItems = aiAppData.recommendations || [];
  const aiElements = aiItems.length
    ? aiItems.flatMap((item, index) => index ? [{ tag: 'hr' }, aiAppBlock(item, index)] : [aiAppBlock(item, index)])
    : [{ tag: 'div', text: { tag: 'lark_md', content: aiAppData.conclusion || '今日未发现足够高质量的 AI C端应用与 Codex 生态更新，已跳过，不硬凑。' } }];
  const total = (githubData.topPick ? 1 : 0) + (githubData.selectedProjects || []).length + (podcastData.recommendations || []).length + aiItems.length;
  const screening = aiAppData.screening || {};
  const githubScreening = githubData.screening || {};
  const podcastScreening = podcastData.screening || {};
  return {
    config: { wide_screen_mode: true },
    header: { template: 'blue', title: { tag: 'plain_text', content: `每日 AI / Codex / Vibe Coding 雷达｜${date}` } },
    elements: [
      { tag: 'div', text: { tag: 'lark_md', content: '**一、Vibe Coding / GitHub Radar**' } }, ...githubCard.elements,
      { tag: 'hr' }, { tag: 'div', text: { tag: 'lark_md', content: '**二、Codex / AI Coding 播客雷达**' } }, ...podcastCard.elements,
      { tag: 'hr' }, { tag: 'div', text: { tag: 'lark_md', content: '**三、AI C端应用与 Codex 生态更新雷达**' } }, ...aiElements,
      { tag: 'hr' }, { tag: 'div', text: { tag: 'lark_md', content:
        `**四、今日总评**\n- 今日最终入选：${total} 条\n- 三类分别入选：GitHub ${(githubData.topPick ? 1 : 0) + (githubData.selectedProjects || []).length}；播客 ${(podcastData.recommendations || []).length}；AI 应用生态 ${aiItems.length}\n` +
        `- GitHub 候选：${githubScreening.candidateCount || 0}/${githubScreening.candidateTarget || 300}；硬门槛通过：${githubScreening.hardGatePassed || 0}；Gemini 成功：${githubScreening.geminiSucceeded || 0}\n` +
        `- 播客候选：${podcastScreening.candidateCount || 0}/${podcastScreening.candidateTarget || 100}；硬门槛通过：${podcastScreening.hardGatePassed || 0}；Gemini 成功：${podcastScreening.geminiSucceeded || 0}\n` +
        `- AI 应用生态候选：${screening.candidateCount || 0}；达标：${screening.qualifiedCount || 0}；Gemini 成功：${screening.geminiSuccessCount || 0}\n- 被筛掉的主要原因：${(screening.excludedReasons || []).join('；') || '低于质量门槛或证据不足'}\n- 原则：真实来源建池、规则守硬门槛、Gemini 3.1 Pro 最终语义评审；宁缺毋滥。` } },
      ...(timing.warning ? [{ tag: 'hr' }, { tag: 'note', elements: [{ tag: 'plain_text', content: timing.warning }] }] : []),
      { tag: 'action', actions: [{ tag: 'button', text: { tag: 'plain_text', content: '查看 GitHub 三合一完整日报' }, url: combinedReportUrl, type: 'primary' }] }
    ]
  };
}

function postJson(url, payload) {
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000
    }, response => {
      let content = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { content += chunk; });
      response.on('end', () => {
        let result;
        try { result = JSON.parse(content); } catch { return reject(new Error(`Feishu returned invalid JSON: ${content}`)); }
        if (response.statusCode < 200 || response.statusCode >= 300 || result.code !== 0) {
          return reject(new Error(`Feishu push failed (${response.statusCode}): ${content}`));
        }
        resolve(result);
      });
    });
    request.on('timeout', () => request.destroy(new Error('Feishu request timed out')));
    request.on('error', reject);
    request.end(body);
  });
}

async function sendCardOnce(card, credentials, poster = postJson) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return poster(credentials.webhook, { timestamp, sign: sign(timestamp, credentials.secret), msg_type: 'interactive', card });
}

async function main() {
  const processStartedAt = new Date();
  const ctx = triggerContext();
  console.log(`[time] trigger=${ctx.event}; ${ctx.isScheduled ? 'schedule 自动触发，执行延迟检测' : '手动/本地运行，不执行每日延迟告警'}`);
  if (ctx.scheduledAt) logTime('workflow scheduled time', ctx.scheduledAt);
  if (ctx.workflowStartedAt) logTime('workflow job start time', ctx.workflowStartedAt);
  logTime('飞书发送步骤/内容生成开始时间', processStartedAt);
  const podcastMode = process.argv.includes('--codex-podcasts');
  const combinedMode = process.argv.includes('--combined');
  const dailyMode = process.argv.includes('--daily');
  const githubData = JSON.parse(fs.readFileSync('data/latest.json', 'utf8'));
  const podcastData = (podcastMode || combinedMode || dailyMode)
    ? JSON.parse(fs.readFileSync('data/codex-podcasts-latest.json', 'utf8'))
    : null;
  const aiAppData = dailyMode ? JSON.parse(fs.readFileSync('data/ai-app-radar-latest.json', 'utf8')) : null;
  const githubItems = refreshDecisions([githubData.topPick, ...(githubData.selectedProjects || [])].filter(Boolean), 'github');
  githubData.topPick = githubItems[0] || null; githubData.selectedProjects = githubItems.slice(1);
  if (podcastData) podcastData.recommendations = refreshDecisions(podcastData.recommendations || [], 'podcast');
  if (aiAppData) aiAppData.recommendations = refreshDecisions(aiAppData.recommendations || [], 'aiapp');
  logTime('飞书内容准备完成时间', new Date());
  const dryRun = process.env.FEISHU_DRY_RUN === '1';
  const forceSend = /^(1|true|yes)$/i.test(process.env.FORCE_SEND || '');
  const sendDecision = evaluateSend({ ledger: loadSendLedger(), force: forceSend, dryRun });
  if (!dryRun && !sendDecision.allowed) {
    console.log(`[send-lock] 今日已成功发送，跳过重复真发。previousRunId=${sendDecision.previous?.runId || 'unknown'}；如确需重发，请手动运行并勾选 force_send。`);
    return;
  }
  const credentials = dryRun ? null : { webhook: requiredEnv('FEISHU_WEBHOOK'), secret: requiredEnv('FEISHU_SECRET') };
  await waitUntilTarget();
  const timing = delayDiagnostic(new Date());
  if (dailyMode) {
    const reportPath = writeDailyReport(githubData, podcastData, aiAppData, undefined, timing);
    console.log(`Combined daily report written to ${reportPath}.`);
  }
  const data = podcastMode ? podcastData : githubData;
  const card = dailyMode ? buildDailyCard(githubData, podcastData, aiAppData, timing) : combinedMode ? buildCombinedCard(githubData, podcastData) : podcastMode ? buildPodcastCard(podcastData) : buildCard(githubData);
  if (dryRun) {
    if (process.env.FEISHU_PREVIEW_FILE) {
      fs.writeFileSync(process.env.FEISHU_PREVIEW_FILE, JSON.stringify(card, null, 2));
      console.log(`Feishu preview written to ${process.env.FEISHU_PREVIEW_FILE}.`);
    }
    console.log(JSON.stringify(card, null, 2));
    console.log(`Feishu dry run completed for ${data.date}; no request was sent.`);
    return;
  }
  const digest = messageDigest(card);
  logTime('飞书发送开始时间', new Date());
  try {
    await sendCardOnce(card, credentials);
  } catch (error) {
    recordSend({ status: 'failed', trigger: ctx.event, runId: process.env.GITHUB_RUN_ID, digest, error: error.message, force: forceSend });
    throw error;
  }
  const sentAt = new Date();
  const sendEntry = recordSend({ status: 'sent', trigger: ctx.event, runId: process.env.GITHUB_RUN_ID, digest, force: forceSend, date: sentAt });
  console.log(`[send-lock] 发送成功台账已记录：${sendEntry.date} ${sendEntry.actualSendTime} digest=${sendEntry.messageDigest}`);
  logTime('飞书发送成功时间', sentAt);
  const totalStart = ctx.workflowStartedAt || processStartedAt;
  console.log(`[time] 总耗时=${Math.round((sentAt - totalStart) / 1000)} 秒；飞书步骤耗时=${Math.round((sentAt - processStartedAt) / 1000)} 秒；相对目标 06:45 延迟=${delayDiagnostic(sentAt).delayMinutes} 分钟`);
  if (dailyMode) {
    recordPushed([githubData.topPick, ...(githubData.selectedProjects || [])].filter(Boolean), 'github', process.cwd(), sentAt);
    recordPushed(podcastData.recommendations || [], 'podcast', process.cwd(), sentAt);
    recordPushed(aiAppData.recommendations || [], 'aiapp', process.cwd(), sentAt);
    writeDailyReport(githubData, podcastData, aiAppData, undefined, delayDiagnostic(sentAt));
  }
  console.log(`Feishu ${combinedMode ? 'combined GitHub and Codex podcast radar' : podcastMode ? 'Codex podcast radar' : 'digest'} sent successfully for ${data.date}.`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { sign, buildCard, buildPodcastCard, buildCombinedCard, buildDailyCard, aiAppBlock, feedbackMeta, refreshDecisions, postJson, sendCardOnce, main };
