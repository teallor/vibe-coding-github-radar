const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDuration, classifyEpisode, extractOutline } = require('../scripts/find-codex-podcasts');
const { buildPodcastCard, buildCombinedCard } = require('../scripts/send-feishu');

test('parses common podcast duration formats', () => {
  assert.equal(parseDuration('01:02:03'), 3723);
  assert.equal(parseDuration('25:30'), 1530);
  assert.equal(parseDuration('1199'), 1199);
  assert.equal(parseDuration('unknown'), null);
});

test('never recommends a title-only candidate', () => {
  const item = classifyEpisode({
    podcastName: '中文节目', title: 'Codex CLI 实战', link: 'https://example.com/episode',
    publishedAt: new Date().toISOString(), durationSeconds: 2400, description: ''
  });
  assert.equal(item.conclusion, '待人工确认');
  assert.ok(item.failures.some(reason => reason.includes('Shownotes')));
});

test('hard-rejects episodes shorter than 20 minutes', () => {
  const description = '本期用 OpenAI Codex CLI 实战演示 GitHub 项目自动化工作流。\n详细拆解命令行配置与项目开发过程。\n最后总结 Vibe Coding 构建真实工具的经验。'.repeat(3);
  const item = classifyEpisode({
    podcastName: '中文节目', title: 'OpenAI Codex CLI 实战', link: 'https://example.com/episode',
    publishedAt: new Date().toISOString(), durationSeconds: 1199, description
  });
  assert.equal(item.conclusion, '不推荐');
  assert.ok(item.failures.some(reason => reason.includes('少于 20 分钟')));
});

test('outline is extracted only from supplied description', () => {
  const outline = extractOutline('第一部分：介绍 Codex CLI 的配置方法。\n第二部分：演示 GitHub 自动化工作流。\n第三部分：复盘真实工具的构建过程。');
  assert.deepEqual(outline, ['第一部分：介绍 Codex CLI 的配置方法。', '第二部分：演示 GitHub 自动化工作流。', '第三部分：复盘真实工具的构建过程。']);
});

test('zero-result card states that no reliable podcast was found', () => {
  const card = buildPodcastCard({
    date: '2026-07-03', conclusion: '今日未找到足够可靠的高质量中文 Codex 播客',
    recommendations: [], pending: [], rejected: [],
    screening: { sources: ['公开 RSS'], excluded: ['时长不足'], sourceFailures: [], candidateCount: 0 }
  });
  assert.equal(card.header.title.content, '【Codex 中文播客雷达】2026-07-03');
  assert.match(JSON.stringify(card), /今日未找到足够可靠/);
});

test('combined card preserves GitHub radar and adds podcast radar', () => {
  const github = { date: '2026-07-03', summary: 'GitHub 今日结论', selectedProjects: [] };
  const podcast = {
    date: '2026-07-03', conclusion: '今日未找到足够可靠的高质量中文 Codex 播客',
    recommendations: [], pending: [], rejected: [],
    screening: { sources: ['公开 RSS'], excluded: ['时长不足'], sourceFailures: [], candidateCount: 0 }
  };
  const text = JSON.stringify(buildCombinedCard(github, podcast));
  assert.match(text, /GitHub 今日结论/);
  assert.match(text, /OpenAI Codex 高质量中文播客雷达/);
  assert.match(text, /今日未找到足够可靠/);
});
