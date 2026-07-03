/**
 * Discover Chinese Codex podcast episodes from Apple Podcasts' public index,
 * then verify duration and shownotes against each podcast's public RSS feed.
 * No recommendation is made from a title alone.
 */
const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const OUTPUT = path.join(process.cwd(), 'data', 'codex-podcasts-latest.json');
const MAX_RECOMMENDATIONS = 3;
const MAX_FEEDS = 60;
const NETWORK_CONCURRENCY = 6;
const SEARCH_TERMS = [
  'OpenAI Codex', 'Codex CLI', 'Codex App', 'Codex 编程',
  'AI 编程智能体', 'Vibe Coding', 'GitHub 自动化'
];
const COUNTRIES = ['cn', 'hk', 'tw'];
const CODEX_TERMS = ['openai codex', 'codex app', 'codex cli', 'codex coding agent', 'codex agent', 'codex 编程', 'codex 应用'];
const PRACTICAL_TERMS = ['实战', '实操', '演示', '教程', '工作流', 'workflow', 'cli', '命令行', 'github', '项目', '自动化', '开发', '构建', '部署', '产品', '工具', '办公', 'office', 'vibe coding'];
const GENERIC_NEWS_TERMS = ['新闻速递', '一周新闻', '本周新闻', '行业快讯', '模型发布', '融资新闻'];

function log(message) { console.log(`[podcast-radar] ${message}`); }

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') return textOf(value['#text'] ?? value.__cdata ?? value.value ?? '');
  return '';
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function cleanText(value) {
  return decodeEntities(textOf(value))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?\s*>|<\/p>|<\/li>|<\/h\d>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function parseDuration(value) {
  const raw = textOf(value).trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  const parts = raw.split(':').map(Number);
  if (parts.some(Number.isNaN) || parts.length < 2 || parts.length > 3) return null;
  return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
}

function durationLabel(seconds) {
  if (!Number.isFinite(seconds)) return '无法确认';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours} 小时 ${minutes} 分钟` : `${minutes} 分钟`;
}

function chineseRatio(text) {
  const chars = String(text || '').replace(/\s/g, '');
  if (!chars.length) return 0;
  return (chars.match(/[\u3400-\u9fff]/g) || []).length / chars.length;
}

function termCount(text, terms) {
  const haystack = String(text || '').toLowerCase();
  return terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
}

function extractOutline(description) {
  const lines = cleanText(description)
    .split(/\n|(?<=[。！？；])\s*/)
    .map(line => line.replace(/^[\s\-–—•*\d.)、]+/, '').trim())
    .filter(line => line.length >= 12 && line.length <= 240);
  return [...new Set(lines)].slice(0, 5);
}

function scoreEpisode(episode, now = new Date()) {
  const evidence = `${episode.title}\n${episode.description}`.toLowerCase();
  const codexHits = termCount(evidence, CODEX_TERMS);
  const practicalHits = termCount(evidence, PRACTICAL_TERMS);
  const outline = extractOutline(episode.description);
  const ageDays = episode.publishedAt ? Math.max(0, (now - new Date(episode.publishedAt)) / 86400000) : Infinity;

  const scores = {
    codexRelevance: Math.min(30, codexHits * 12),
    practicalDensity: Math.min(25, practicalHits * 4),
    outlineVerifiability: outline.length >= 3 && cleanText(episode.description).length >= 180 ? 15 : outline.length ? 8 : 0,
    personalValue: Math.min(15, termCount(evidence, ['vibe coding', 'github', 'office', '办公', '自动化', '项目', '产品', '工具', '变现']) * 3),
    podcastQuality: Math.min(10, (outline.length >= 3 ? 5 : 2) + (cleanText(episode.description).length >= 350 ? 3 : 0) + (episode.podcastName ? 2 : 0)),
    timeliness: ageDays <= 30 ? 5 : ageDays <= 90 ? 4 : ageDays <= 180 ? 3 : ageDays <= 365 ? 2 : 1
  };
  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  return { scores, total, outline, codexHits, practicalHits };
}

function classifyEpisode(episode, now = new Date()) {
  const description = cleanText(episode.description);
  const combined = `${episode.title} ${description}`;
  const result = scoreEpisode({ ...episode, description }, now);
  const failures = [];
  if (!Number.isFinite(episode.durationSeconds)) failures.push('无法确认时长');
  else if (episode.durationSeconds < 1200) failures.push('时长少于 20 分钟');
  if (description.length < 80 || result.outline.length === 0) failures.push('没有足够可读的 Shownotes、简介、大纲或摘要');
  if (result.codexHits === 0) failures.push('正文证据中没有明确且实质性的 Codex 内容');
  if (termCount(combined, GENERIC_NEWS_TERMS) > 0 && result.practicalHits < 3) failures.push('内容主要是泛泛 AI 新闻或模型发布消息');
  if (chineseRatio(combined) < 0.12) failures.push('中文内容不足');
  if (!episode.link || !/^https?:\/\//.test(episode.link)) failures.push('缺少可验证的单集链接');

  let conclusion = failures.length ? '不推荐' : result.total >= 75 ? '推荐' : '不推荐';
  if (description.length < 80 && /codex/i.test(episode.title)) conclusion = '待人工确认';
  if (!failures.length && result.total < 75) failures.push(`总分 ${result.total}，低于正式推荐阈值 75`);
  return { ...episode, description, ...result, failures, conclusion };
}

function rssItems(parsed) {
  const channel = parsed?.rss?.channel;
  if (channel) return { podcastName: cleanText(channel.title), items: asArray(channel.item) };
  const feed = parsed?.feed;
  if (feed) return { podcastName: cleanText(feed.title), items: asArray(feed.entry) };
  return { podcastName: '', items: [] };
}

function itemLink(item) {
  const links = asArray(item.link);
  for (const link of links) {
    if (typeof link === 'string') return link;
    if (link?.href && (!link.rel || link.rel === 'alternate')) return link.href;
  }
  return cleanText(item.guid);
}

function normalizeItem(item, podcastName) {
  const description = item['content:encoded'] ?? item.description ?? item.summary ?? item.content ?? '';
  return {
    podcastName,
    title: cleanText(item.title),
    link: itemLink(item),
    publishedAt: cleanText(item.pubDate ?? item.published ?? item.updated),
    durationSeconds: parseDuration(item['itunes:duration'] ?? item.duration),
    description
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, headers: { 'User-Agent': 'vibe-coding-github-radar/1.0', ...(options.headers || {}) } });
  } finally { clearTimeout(timer); }
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function discoverFeeds() {
  const failures = [];
  const searches = COUNTRIES.flatMap(country => SEARCH_TERMS.map(term => ({ country, term })));
  const resultGroups = await mapLimit(searches, NETWORK_CONCURRENCY, async ({ country, term }) => {
      const url = `https://itunes.apple.com/search?media=podcast&entity=podcast&limit=25&country=${country}&term=${encodeURIComponent(term)}`;
      try {
        const response = await fetchWithTimeout(url, {}, 10000);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        log(`Apple Podcasts (${country}, “${term}”): ${data.resultCount || 0} 个节目候选`);
        return (data.results || []).filter(result => result.feedUrl);
      } catch (error) {
        const reason = `Apple Podcasts (${country}, “${term}”) 失败: ${error.message}`;
        failures.push(reason); log(reason);
        return [];
      }
  });
  const ordered = resultGroups.flat();
  const feeds = new Map();
  // Chinese-titled/hosted shows get scarce RSS verification slots first; the
  // remainder stay available as fallback because some Chinese shows use English names.
  for (const result of [...ordered.filter(result => chineseRatio(`${result.collectionName} ${result.artistName}`) >= 0.08), ...ordered]) {
    if (!feeds.has(result.feedUrl)) feeds.set(result.feedUrl, result.collectionName || '未知节目');
  }
  return { feeds, failures };
}

async function verifyLink(url) {
  try {
    const response = await fetchWithTimeout(url, { method: 'HEAD', redirect: 'follow' }, 10000);
    if (response.ok) return true;
    if ([403, 405].includes(response.status)) {
      const fallback = await fetchWithTimeout(url, { headers: { Range: 'bytes=0-0' }, redirect: 'follow' }, 10000);
      return fallback.ok;
    }
    return false;
  } catch { return false; }
}

async function scanFeeds(feeds, sourceFailures) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', textNodeName: '#text', cdataPropName: '__cdata' });
  const candidates = [];
  const failures = [...sourceFailures];
  const feedEntries = [...feeds].slice(0, MAX_FEEDS);
  await mapLimit(feedEntries, NETWORK_CONCURRENCY, async ([feedUrl, indexedName], index) => {
    try {
      const response = await fetchWithTimeout(feedUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xml = await response.text();
      const { podcastName, items } = rssItems(parser.parse(xml));
      let matching = 0;
      for (const item of items.slice(0, 100)) {
        const episode = normalizeItem(item, podcastName || indexedName);
        const searchable = `${episode.title} ${cleanText(episode.description)}`;
        if (!/codex/i.test(searchable)) continue;
        matching += 1;
        candidates.push(classifyEpisode({ ...episode, feedUrl }));
      }
      log(`RSS [${index + 1}/${feedEntries.length}] ${podcastName || indexedName}: ${items.length} 集，Codex 候选 ${matching} 集`);
    } catch (error) {
      const reason = `RSS 解析失败 (${indexedName}, ${feedUrl}): ${error.message}`;
      failures.push(reason); log(reason);
    }
  });
  return { candidates, failures };
}

function relevanceLabel(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const labels = [];
  if (text.includes('codex app')) labels.push('Codex App 使用经验');
  if (text.includes('codex cli') || text.includes('命令行')) labels.push('Codex CLI 使用经验');
  if (text.includes('coding agent') || text.includes('编程智能体')) labels.push('Codex Coding Agent 实战');
  if (text.includes('github')) labels.push('用 Codex 做 GitHub 项目');
  if (text.includes('office') || text.includes('办公自动化')) labels.push('用 Codex 做办公自动化');
  if (text.includes('vibe coding')) labels.push('用 Codex 做 Vibe Coding');
  if (text.includes('产品') || text.includes('工具')) labels.push('用 Codex 做实际产品或工具');
  return labels.length ? labels.join('；') : 'Shownotes 中明确讨论 Codex 实际应用';
}

function valueReason(item) {
  const dimensions = [];
  const text = `${item.title} ${item.description}`.toLowerCase();
  if (text.includes('vibe coding')) dimensions.push('Vibe Coding 工作流');
  if (text.includes('github')) dimensions.push('GitHub 项目实践');
  if (text.includes('自动化') || text.includes('office') || text.includes('办公')) dimensions.push('自动化落地');
  if (text.includes('产品') || text.includes('工具')) dimensions.push('真实工具构建');
  return `Shownotes 提供了可核验的${dimensions.slice(0, 3).join('、') || 'Codex 实操信息'}，可用于判断具体方法是否能迁移到你的 Codex 学习与项目实践中。推荐依据来自节目正文说明，不是标题推断。`;
}

async function main() {
  log('开始搜索；正式推荐必须同时通过时长、中文、正文证据、链接和评分检查。');
  const { feeds, failures: discoveryFailures } = await discoverFeeds();
  log(`去重后共 ${feeds.size} 个公开 RSS 源；本次按检索顺序最多核验 ${MAX_FEEDS} 个。`);
  const { candidates, failures } = await scanFeeds(feeds, discoveryFailures);
  for (const candidate of candidates) {
    if (candidate.conclusion === '推荐' && !(await verifyLink(candidate.link))) {
      candidate.conclusion = '不推荐';
      candidate.failures.push('单集链接无法访问');
    }
    log(`候选：${candidate.podcastName}｜${candidate.title}｜${candidate.total} 分｜${candidate.conclusion}${candidate.failures.length ? `｜${candidate.failures.join('；')}` : ''}`);
  }

  const recommendations = candidates
    .filter(item => item.conclusion === '推荐')
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_RECOMMENDATIONS)
    .map(item => ({
      podcastName: item.podcastName, title: item.title, link: item.link,
      publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : '无法识别',
      durationSeconds: item.durationSeconds, duration: durationLabel(item.durationSeconds),
      outline: item.outline.slice(0, 5), whyWorthListening: valueReason(item),
      codexRelevance: relevanceLabel(item), qualityScore: item.total,
      scoreBreakdown: item.scores, conclusion: '推荐', evidenceSource: item.feedUrl
    }));
  const pending = candidates.filter(item => item.conclusion === '待人工确认').slice(0, 10).map(item => ({
    podcastName: item.podcastName, title: item.title, link: item.link, reasons: item.failures
  }));
  const rejected = candidates.filter(item => item.conclusion === '不推荐').map(item => ({
    podcastName: item.podcastName, title: item.title, score: item.total, reasons: item.failures
  }));
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const data = {
    date,
    conclusion: recommendations.length
      ? `今日找到 ${recommendations.length} 条符合标准的高质量中文 Codex 播客`
      : '今日未找到足够可靠的高质量中文 Codex 播客',
    recommendations, pending, rejected,
    screening: {
      sources: ['Apple Podcasts 中国大陆/香港/台湾公开索引', `${feeds.size} 个由 Apple 索引返回的公开 RSS 源`],
      searchedTerms: SEARCH_TERMS,
      excluded: ['少于 20 分钟或时长无法确认', '无可读 Shownotes/简介/摘要', '正文无实质 Codex 内容', '泛泛 AI 新闻', '中文不足', '链接不可访问', '总分低于 75'],
      sourceFailures: failures,
      candidateCount: candidates.length
    },
    generatedAt: new Date().toISOString()
  };
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2));
  log(`完成：正式推荐 ${recommendations.length}，待人工确认 ${pending.length}，淘汰 ${rejected.length}。`);
  log(`输出：${OUTPUT}`);
}

if (require.main === module) {
  main().catch(error => { console.error(`[podcast-radar] 运行失败: ${error.stack || error.message}`); process.exit(1); });
}

module.exports = { cleanText, parseDuration, durationLabel, extractOutline, scoreEpisode, classifyEpisode, normalizeItem };
