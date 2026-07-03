const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { dailyReportFilename, buildDailyMarkdown, writeDailyReport } = require('../scripts/daily-report');
const { buildDailyCard } = require('../scripts/send-feishu');

function fixtures() {
  const github = { date: '2026-07-04', summary: 'GitHub summary', screening: { candidateCount: 318, candidateTarget: 300, geminiSucceeded: 9 },
    topPick: { name: 'office-agent', url: 'https://github.com/example/office-agent', description: 'Office agent', recommendScore: 92, reviewProvider: 'vertex', semanticReview: { valueForRafael: '可用于课程' } }, selectedProjects: [] };
  const podcast = { date: '2026-07-04', conclusion: 'Podcast summary', screening: { candidateCount: 120, candidateTarget: 100, geminiSucceeded: 9 },
    recommendations: [{ podcastName: '实战播客', title: 'Codex 实战', link: 'https://example.com/podcast', duration: '1 小时', publishedAt: '2026-07-03', outline: ['安装', '工作流'], whyWorthListening: '有实操', codexRelevance: '可复现', qualityScore: 93, reviewProvider: 'vertex' }] };
  const ai = { date: '2026-07-04', conclusion: 'AI summary', screening: { candidateCount: 134, geminiSuccessCount: 10 },
    recommendations: [{ title: 'MCP Tool', link: 'https://github.com/example/mcp', type: 'MCP', source: 'GitHub', whatHappened: '发布新版本', consumerUseCase: '连接工具', valueForRafael: '自动化', codexIntegrationPotential: '适合', actionSuggestion: '试用', score: 91, reviewProvider: 'vertex' }] };
  return { github, podcast, ai };
}

test('combined Markdown report mirrors all three Feishu sections', () => {
  const { github, podcast, ai } = fixtures();
  const markdown = buildDailyMarkdown(github, podcast, ai);
  assert.match(markdown, /Vibe Coding \/ GitHub Radar/);
  assert.match(markdown, /Codex \/ AI Coding 播客雷达/);
  assert.match(markdown, /AI C端应用与 Codex 生态更新雷达/);
  assert.match(markdown, /office-agent/);
  assert.match(markdown, /Codex 实战/);
  assert.match(markdown, /MCP Tool/);
  assert.match(markdown, /GitHub 候选：318\/300/);
});

test('daily run writes the combined report under reports with a stable filename', () => {
  const { github, podcast, ai } = fixtures();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-report-'));
  try {
    const file = writeDailyReport(github, podcast, ai, dir);
    assert.equal(path.basename(file), dailyReportFilename('2026-07-04'));
    assert.match(fs.readFileSync(file, 'utf8'), /每日 AI \/ Codex \/ Vibe Coding 雷达/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('Feishu daily card links to the GitHub combined report', () => {
  const { github, podcast, ai } = fixtures();
  const card = buildDailyCard(github, podcast, ai);
  const text = JSON.stringify(card);
  assert.match(text, /查看 GitHub 三合一完整日报/);
  assert.match(decodeURIComponent(text), /2026-07-04_每日AI_Codex_VibeCoding雷达\.md/);
});
