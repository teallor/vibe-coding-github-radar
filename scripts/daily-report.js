const fs = require('fs');
const path = require('path');

function dailyReportFilename(date) {
  return `${date}_每日AI_Codex_VibeCoding雷达.md`;
}

function line(value, fallback = '未提供') {
  const text = String(value || '').replace(/\r/g, '').trim();
  return text || fallback;
}

function githubSection(data) {
  const items = [data.topPick, ...(data.selectedProjects || [])].filter(Boolean);
  if (!items.length) return `## 一、Vibe Coding / GitHub Radar\n\n${line(data.summary, '今日未发现足够高质量的 GitHub 项目，已跳过，不硬凑。')}\n`;
  const blocks = items.map((item, index) => `### ${index + 1}. [${item.name}](${item.url})

- 一句话结论：${line(item.semanticReview?.oneLineConclusion || item.description)}
- 核心内容：${line(item.semanticReview?.whatHappened || item.description)}
- 为什么值得看：${line(item.semanticReview?.reasons?.join('；') || item.vibeCodingValue)}
- Rafael_Huang 可以怎么用：${line(item.semanticReview?.valueForRafael || item.codexFriendly)}
- 行动建议：${line(item.semanticReview?.actionSuggestion, '先阅读 README，再让 Codex 做最小复现。')}
- 质量评分：${item.recommendScore || 0}/100
- 最终评审：${item.reviewProvider === 'vertex' ? 'Gemini 3.1 Pro' : '规则降级'}
`).join('\n');
  return `## 一、Vibe Coding / GitHub Radar\n\n${blocks}`;
}

function podcastSection(data) {
  const items = data.recommendations || [];
  if (!items.length) return `## 二、Codex / AI Coding 播客雷达\n\n${line(data.conclusion, '今日未发现足够高质量播客，已跳过，不硬凑。')}\n`;
  const blocks = items.map((item, index) => `### ${index + 1}. ${line(item.podcastName)}｜[${item.title}](${item.link})

- 时长：${line(item.duration)}
- 发布日期：${line(item.publishedAt)}
- 内容大纲：${(item.outline || []).map(point => `\n  - ${line(point)}`).join('') || '未提供'}
- 为什么值得听：${line(item.whyWorthListening)}
- 对 Codex / Vibe Coding / 办公自动化的价值：${line(item.codexRelevance)}
- 质量评分：${item.qualityScore || 0}/100
- 最终评审：${item.reviewProvider === 'vertex' ? 'Gemini 3.1 Pro' : '规则降级'}
`).join('\n');
  return `## 二、Codex / AI Coding 播客雷达\n\n${blocks}`;
}

function aiAppSection(data) {
  const items = data.recommendations || [];
  if (!items.length) return `## 三、AI C端应用与 Codex 生态更新雷达\n\n${line(data.conclusion, '今日未发现足够高质量内容，已跳过，不硬凑。')}\n`;
  const blocks = items.map((item, index) => {
    const extra = ['Codex', 'Skill', 'MCP', '插件'].includes(item.type) ? `
- 适合解决的问题：${line(item.suitableProblem)}
- 使用门槛：${line(item.usageBarrier)}
- 是否需要 API Key / Token：${line(item.requiresApiKey)}
- 是否适合小白：${line(item.beginnerFriendly)}
- 是否值得保存到工具库：${line(item.saveToToolkit)}` : '';
    return `### ${index + 1}. [${item.title}](${item.link})

- 类型：${line(item.type)}
- 来源：${line(item.source)}
- 发生了什么：${line(item.whatHappened)}
- C端用户能怎么用：${line(item.consumerUseCase)}
- 对 Rafael_Huang 的价值：${line(item.valueForRafael)}
- 是否适合让 Codex 集成或复现：${line(item.codexIntegrationPotential)}
- 行动建议：${line(item.actionSuggestion)}
- 质量评分：${item.score || 0}/100
- 最终评审：${item.reviewProvider === 'vertex' ? 'Gemini 3.1 Pro' : '规则降级'}${extra}
`;
  }).join('\n');
  return `## 三、AI C端应用与 Codex 生态更新雷达\n\n${blocks}`;
}

function buildDailyMarkdown(githubData, podcastData, aiAppData) {
  const date = aiAppData.date || podcastData.date || githubData.date;
  const githubItems = (githubData.topPick ? 1 : 0) + (githubData.selectedProjects || []).length;
  const podcastItems = (podcastData.recommendations || []).length;
  const aiItems = (aiAppData.recommendations || []).length;
  const gs = githubData.screening || {}; const ps = podcastData.screening || {}; const as = aiAppData.screening || {};
  return `# 每日 AI / Codex / Vibe Coding 雷达｜${date}

> 本文件与当日飞书三合一推送由同一份数据自动生成。Original Author: Rafael_Huang

${githubSection(githubData)}

${podcastSection(podcastData)}

${aiAppSection(aiAppData)}

## 四、今日总评

- 今日最终入选：${githubItems + podcastItems + aiItems} 条
- 三类分别入选：GitHub ${githubItems}；播客 ${podcastItems}；AI 应用生态 ${aiItems}
- GitHub 候选：${gs.candidateCount || 0}/${gs.candidateTarget || 300}；Gemini 成功：${gs.geminiSucceeded || 0}
- 播客候选：${ps.candidateCount || 0}/${ps.candidateTarget || 100}；Gemini 成功：${ps.geminiSucceeded || 0}
- AI 应用生态候选：${as.candidateCount || 0}；Gemini 成功：${as.geminiSuccessCount || 0}
- 原则：真实来源建池、规则守硬门槛、Gemini 3.1 Pro 最终语义评审；宁缺毋滥。

---

生成时间：${new Date().toISOString()}
`;
}

function writeDailyReport(githubData, podcastData, aiAppData, outputDir = path.join(process.cwd(), 'reports')) {
  const date = aiAppData.date || podcastData.date || githubData.date;
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, dailyReportFilename(date));
  fs.writeFileSync(filePath, buildDailyMarkdown(githubData, podcastData, aiAppData), 'utf8');
  return filePath;
}

module.exports = { dailyReportFilename, buildDailyMarkdown, writeDailyReport };
