const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const { loadRuntimeConfig } = require('./runtime-config');
const { reviewCandidate } = require('./llm-reviewer');

const OUTPUT = path.join(process.cwd(), 'data', 'ai-app-radar-latest.json');
const OFFICIAL_FEEDS = [
  { name: 'OpenAI News', url: 'https://openai.com/news/rss.xml', reliability: 10 },
  { name: 'GitHub Changelog', url: 'https://github.blog/changelog/feed/', reliability: 10 },
  { name: 'Google Developers Blog', url: 'https://developers.googleblog.com/feeds/posts/default', reliability: 10 },
  { name: 'Microsoft DevBlogs', url: 'https://devblogs.microsoft.com/feed/', reliability: 9 }
];
const SEARCH_QUERIES = [
  'codex OR "codex cli" OR "codex app"', '"model context protocol" OR "mcp server"',
  '"chatgpt skill" OR "agent skill"', '"coding agent" OR "ai coding"',
  '"office automation" OR pptx OR docx OR xlsx', '"browser agent" automation',
  '"claude code" OR "gemini cli"', 'cursor OR windsurf OR aider OR continue',
  '"github actions" agent', 'notebooklm OR gamma OR manus OR genspark'
];

function clean(value) {
  return String(value || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function textOf(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(textOf).join(' ');
  return textOf(value['#text'] ?? value.__cdata ?? value.content ?? value.summary ?? '');
}

function itemLink(item) {
  const links = Array.isArray(item.link) ? item.link : [item.link];
  for (const link of links) {
    if (typeof link === 'string') return link;
    if (link?.href && (!link.rel || link.rel === 'alternate')) return link.href;
  }
  return textOf(item.guid);
}

function classifyType(text) {
  const t = text.toLowerCase();
  if (/openai codex|codex cli|codex app|codex workflow/.test(t)) return 'Codex';
  if (/model context protocol|mcp server|\bmcp\b/.test(t)) return 'MCP';
  if (/chatgpt skill|agent skill|\bskills?\b/.test(t)) return 'Skill';
  if (/plugin|extension|插件|扩展/.test(t)) return '插件';
  if (/agent|aider|continue|cursor|windsurf|claude code|gemini cli/.test(t)) return 'Agent 工具';
  if (/model|模型/.test(t)) return '模型更新';
  if (/chatgpt|claude|gemini|deepseek|kimi|豆包|通义|扣子|notebooklm|gamma|manus|genspark/.test(t)) return 'AI 产品功能';
  return '其他';
}

function priorityFor(type, text) {
  if (type === 'Codex') return 1;
  if (['Skill', 'MCP', '插件', 'Agent 工具'].includes(type)) return 2;
  if (type === 'AI 产品功能') return /powerpoint|ppt|word|excel|office|document|browser|知识库|课程/.test(text.toLowerCase()) ? 4 : 3;
  if (type === '模型更新') return 5;
  return 6;
}

function ruleReview(candidate, runtime) {
  const cfg = runtime.radars.aiApp;
  const text = `${candidate.title} ${candidate.description}`.toLowerCase();
  const type = classifyType(text);
  const priority = priorityFor(type, text);
  const weightedHits = Object.entries(cfg.keywords).filter(([keyword]) => text.includes(keyword.toLowerCase()));
  const focusHits = runtime.profile.focus.filter(term => text.includes(term.toLowerCase()));
  const excluded = cfg.excludedKeywords.filter(term => text.includes(term.toLowerCase()));
  const ageDays = candidate.publishedAt ? Math.max(0, (Date.now() - new Date(candidate.publishedAt).getTime()) / 86400000) : 999;
  const dimensions = {
    rafaelMatch: Math.min(25, 8 + focusHits.length * 4 + (priority <= 2 ? 5 : 0)),
    consumerUsability: Math.min(20, 7 + (/release|released|available|launch|更新|发布|可用|安装|使用/.test(text) ? 8 : 0) + (candidate.description.length >= 100 ? 5 : 0)),
    ecosystemRelevance: Math.min(20, (priority === 1 ? 20 : priority === 2 ? 17 : priority <= 4 ? 10 : 4) + Math.min(3, weightedHits.length)),
    actionableValue: Math.min(15, 5 + (/github|install|setup|workflow|automation|template|cli|server|plugin|教程|集成/.test(text) ? 7 : 0) + (candidate.url ? 3 : 0)),
    sourceReliability: Math.min(10, candidate.reliability || (candidate.sourceType === 'github' ? 9 : 6)),
    freshness: ageDays <= 7 ? 10 : ageDays <= 30 ? 8 : ageDays <= 90 ? 5 : 2
  };
  let score = Object.values(dimensions).reduce((sum, value) => sum + value, 0) - excluded.length * 25;
  if (!candidate.url || !/^https?:\/\//.test(candidate.url)) score = 0;
  if (excluded.length) score = Math.min(score, 60);
  if (priority === 6) score = Math.min(score, 70);
  score = Math.max(0, Math.min(100, score));
  return {
    shouldRecommend: score >= cfg.minScore, score, type, priority, dimensions,
    oneLineConclusion: candidate.description ? clean(candidate.description).slice(0, 160) : `${candidate.title} 提供了可核验的生态更新。`,
    whatHappened: clean(candidate.description).slice(0, 500),
    consumerUseCase: priority <= 2 ? '可保存并评估安装或接入现有 Codex / Vibe Coding 工作流。' : '可根据官方说明直接试用相关功能。',
    valueForRafael: `命中 ${focusHits.join('、') || 'AI 工具实践'}，可用于学习、办公自动化、课程或副业项目判断。`,
    codexIntegrationPotential: priority <= 2 ? '适合让 Codex 后续检查文档、安装门槛并制作最小复现。' : '可让 Codex 评估是否能接入现有项目。',
    actionSuggestion: '先打开原始来源核对发布说明，再决定试用或加入工具库。',
    reasons: weightedHits.slice(0, 8).map(([keyword]) => `命中高价值方向：${keyword}`),
    risksOrMissingInfo: excluded.length ? [`命中排除主题：${excluded.join('、')}`] : [], evidenceRequired: true
  };
}

async function fetchJson(url, token) {
  const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'vibe-coding-github-radar/2.0', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function githubCandidates(token, failures) {
  const groups = await Promise.all(SEARCH_QUERIES.map(async query => {
    try {
      const q = `${query} in:name,description,readme archived:false pushed:>2025-01-01`;
      const data = await fetchJson(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=10`, token);
      return (data.items || []).map(repo => ({
        id: `github:${repo.full_name}`, title: repo.full_name, url: repo.html_url,
        description: clean(repo.description), publishedAt: repo.pushed_at, source: 'GitHub', sourceType: 'github', reliability: 9,
        metadata: { stars: repo.stargazers_count, language: repo.language, license: repo.license?.spdx_id || '未知', topics: repo.topics || [] }
      }));
    } catch (error) { failures.push(`GitHub 搜索失败 (${query}): ${error.message}`); return []; }
  }));
  return groups.flat();
}

async function feedCandidates(failures) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', textNodeName: '#text', cdataPropName: '__cdata' });
  const groups = await Promise.all(OFFICIAL_FEEDS.map(async feed => {
    try {
      const response = await fetch(feed.url, { headers: { 'User-Agent': 'vibe-coding-github-radar/2.0' }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = parser.parse(await response.text());
      const items = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
      return (Array.isArray(items) ? items : [items]).slice(0, 30).map(item => ({
        id: `feed:${itemLink(item) || textOf(item.title)}`, title: clean(textOf(item.title)), url: itemLink(item),
        description: clean(textOf(item.description ?? item.summary ?? item.content)),
        publishedAt: textOf(item.pubDate ?? item.published ?? item.updated), source: feed.name, sourceType: 'official', reliability: feed.reliability
      }));
    } catch (error) { failures.push(`官方源失败 (${feed.name}): ${error.message}`); return []; }
  }));
  return groups.flat();
}

async function runAiAppRadar(options = {}) {
  const runtime = options.runtime || loadRuntimeConfig();
  const cfg = runtime.radars.aiApp;
  if (!cfg.enabled) return { date: new Date().toISOString().slice(0, 10), disabled: true, recommendations: [], screening: { candidateCount: 0 } };
  const failures = [];
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const raw = options.candidates || [...await githubCandidates(token, failures), ...await feedCandidates(failures)];
  const deduped = [...new Map(raw.filter(item => item.url && item.title).map(item => [item.url.replace(/\/$/, ''), item])).values()];
  let reviewed = deduped.map(candidate => ({ candidate, rule: ruleReview(candidate, runtime) }))
    .filter(item => item.rule.score >= Math.max(60, cfg.minScore - 20))
    .sort((a, b) => a.rule.priority - b.rule.priority || b.rule.score - a.rule.score);

  const llmLimit = options.llmLimit ?? 12;
  for (const item of reviewed.slice(0, llmLimit)) {
    if (!cfg.useGeminiReview) break;
    const result = await reviewCandidate(item.candidate, 'AI C端应用与 Codex 生态更新雷达', runtime.profile, cfg, options.reviewerOptions || {});
    item.llmStatus = result.status;
    item.review = result.status === 'success' ? { ...item.rule, ...result.review, priority: item.rule.priority } : item.rule;
    // Non-negotiable evidence and topic gates cannot be overridden by an LLM score.
    if (item.rule.score < 60 || item.rule.priority === 6 || item.rule.risksOrMissingInfo.length) {
      item.review.shouldRecommend = false;
      item.review.score = Math.min(item.review.score, item.rule.score);
      item.review.risksOrMissingInfo = [...new Set([...(item.review.risksOrMissingInfo || []), ...item.rule.risksOrMissingInfo])];
    }
    item.reviewProvider = result.provider || 'rules';
  }
  reviewed = reviewed.map(item => ({ ...item, review: item.review || item.rule, reviewProvider: item.reviewProvider || 'rules' }));
  const qualified = reviewed.filter(item => item.review.shouldRecommend && item.review.score >= cfg.minScore)
    .sort((a, b) => a.review.priority - b.review.priority || b.review.score - a.review.score);
  const preferred = qualified.filter(item => item.review.score >= cfg.preferScore);
  const selected = (preferred.length ? preferred : qualified).slice(0, cfg.maxItems).map(({ candidate, review, reviewProvider }) => ({
    title: candidate.title, link: candidate.url, source: candidate.source, publishedAt: candidate.publishedAt,
    ...review, reviewProvider,
    suitableProblem: ['Codex', 'Skill', 'MCP', '插件'].includes(review.type) ? review.consumerUseCase : '',
    usageBarrier: candidate.metadata?.language ? `需阅读 ${candidate.metadata.language} 项目文档并核对安装要求` : '以原始发布说明为准',
    requiresApiKey: '未知，需查看原始文档', beginnerFriendly: review.score >= 90 ? '较适合，建议先做最小复现' : '需 Codex 协助评估',
    saveToToolkit: review.priority <= 2 ? '是，值得保存并后续复现' : '视实际使用需求决定'
  }));
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: runtime.timezone }).format(new Date());
  const output = {
    date,
    conclusion: selected.length ? `今日入选 ${selected.length} 条 AI C端应用与 Codex 生态高价值更新` : '今日未发现足够高质量的 AI C端应用与 Codex 生态更新，已跳过，不硬凑。',
    recommendations: selected,
    screening: { candidateTarget: cfg.candidateTarget, candidateCount: deduped.length, reviewedCount: reviewed.length, qualifiedCount: qualified.length, minScore: cfg.minScore, sourceFailures: failures, geminiRequested: cfg.useGeminiReview, geminiSuccessCount: reviewed.filter(item => item.reviewProvider !== 'rules').length,
      excludedReasons: ['低于 85 分', '缺少明确来源', '泛 AI 新闻或营销软文', '融资、股价或传闻', '对 Rafael_Huang 无直接行动价值'] },
    generatedAt: new Date().toISOString()
  };
  if (options.write !== false) { fs.mkdirSync(path.dirname(OUTPUT), { recursive: true }); fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2)); }
  console.log(`[ai-app-radar] 候选 ${deduped.length}，达标 ${qualified.length}，入选 ${selected.length}；Gemini 成功 ${output.screening.geminiSuccessCount}。`);
  return output;
}

if (require.main === module) runAiAppRadar().catch(error => { console.error(`[ai-app-radar] ${error.stack || error.message}`); process.exit(1); });

module.exports = { runAiAppRadar, ruleReview, classifyType, priorityFor };
