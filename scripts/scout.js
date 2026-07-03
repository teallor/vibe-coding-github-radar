/**
 * scout.js - GitHub 项目搜索主脚本
 * GitHub Actions 每日运行，搜索 GitHub 公开仓库并生成数据文件
 *
 * 流程：
 * 1. 读取 config/focus.json（或 default-focus.json，或 fallback）
 * 2. 根据启用的 focus areas 生成搜索关键词
 * 3. 调用 GitHub REST API 搜索公开仓库
 * 4. 根据评分权重计算项目分数
 * 5. 根据黑名单过滤项目
 * 6. 根据白名单和优先语言加分
 * 7. 生成 data/latest.json
 * 8. 更新 data/history.json
 * 9. 生成 reports/YYYY-MM-DD_VibeCoding_GitHub学习日报.md
 *
 * 安全要求：
 * - 不自动 clone 项目
 * - 不运行陌生代码
 * - 不访问私人仓库
 * - 不读取私密数据
 * - 只使用 GitHub Actions 默认 GITHUB_TOKEN 搜索公开仓库
 */

const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./loadConfig');
const { generateSearchTasks } = require('./keywords');
const { scoreProject } = require('./scoring');
const { generateReport, generateCodexPrompt, generateMarkdownTemplate } = require('./report');
const { loadRuntimeConfig } = require('./runtime-config');
const { reviewCandidate } = require('./llm-reviewer');

// GitHub API 配置
const GITHUB_API = 'https://api.github.com';
const PER_PAGE = 30; // 每次搜索返回数量
const MAX_RESULTS = 100; // 最多保留的候选项目数
const RATE_LIMIT_DELAY = 2000; // API 调用间隔（毫秒），避免触发限流

/**
 * 主函数
 */
async function main() {
  console.log('🚀 Vibe Coding GitHub Radar - Daily Scout');
  console.log('=========================================\n');

  // 1. 加载配置
  const { config, source } = loadConfig();
  const runtime = loadRuntimeConfig();
  const radarConfig = runtime.radars.github;
  if (!radarConfig.enabled) {
    console.log('GitHub Radar 已在 config/runtime.json 中关闭。');
    return;
  }
  console.log(`📋 配置来源：${source}`);
  console.log(`📋 需求画像：${config.profileName}`);
  const enabledAreas = (config.enabledFocusAreas || []).filter(a => a.enabled);
  console.log(`📋 启用方向：${enabledAreas.map(a => a.name).join(', ')}\n`);

  // 2. 生成搜索任务
  const tasks = generateSearchTasks(config);
  console.log(`🔍 共生成 ${tasks.length} 个搜索任务\n`);

  if (tasks.length === 0) {
    console.error('❌ 没有生成任何搜索任务，请检查配置');
    process.exit(1);
  }

  // 3. 执行搜索
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  if (token) {
    console.log('🔑 使用 GITHUB_TOKEN 认证（提高 API 限额）\n');
  } else {
    console.log('⚠️ 未检测到 GITHUB_TOKEN，使用匿名请求（限额较低，60次/小时）\n');
  }

  const allCandidates = [];
  const seenRepos = new Set();
  const blockedRepos = new Set(config.blockedRepos || []);
  const searchStats = { taskCount: tasks.length, succeeded: 0, failed: 0, rateLimitRetries: 0, complete: true };
  const addRepos = (repos, area) => {
    for (const repo of repos) {
      if (seenRepos.has(repo.full_name)) continue;
      seenRepos.add(repo.full_name);
      if (blockedRepos.has(repo.full_name)) continue;
      allCandidates.push(normalizeRepo(repo, scoreProject(repo, config, area), area));
    }
  };

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(`[${i + 1}/${tasks.length}] 搜索: ${task.query.substring(0, 80)}...`);

    try {
      const repos = await searchGitHub(task.query, token, { onRetry: () => { searchStats.rateLimitRetries += 1; } });
      searchStats.succeeded += 1;
      console.log(`  → 找到 ${repos.length} 个结果`);

      addRepos(repos, task.area);

      // 限流延迟
      if (i < tasks.length - 1) {
        await sleep(RATE_LIMIT_DELAY);
      }
    } catch (e) {
      searchStats.failed += 1;
      searchStats.complete = false;
      console.error(`  ❌ 搜索失败: ${e.message}`);
      // 继续下一个搜索任务
    }
  }

  if (allCandidates.length < radarConfig.candidateTarget) {
    console.log(`📥 第一轮仅 ${allCandidates.length} 个唯一候选，目标 ${radarConfig.candidateTarget}，开始补抓真实搜索结果第 2 页`);
    for (const task of tasks) {
      if (allCandidates.length >= radarConfig.candidateTarget) break;
      searchStats.taskCount += 1;
      try {
        const repos = await searchGitHub(task.query, token, { page: 2, onRetry: () => { searchStats.rateLimitRetries += 1; } });
        searchStats.succeeded += 1;
        addRepos(repos, task.area);
      } catch (error) {
        searchStats.failed += 1;
        searchStats.complete = false;
        console.error(`  ❌ 补抓失败: ${error.message}`);
      }
    }
  }

  console.log(`\n📊 搜索完成 ${searchStats.succeeded}/${searchStats.taskCount}，失败 ${searchStats.failed}，限流重试 ${searchStats.rateLimitRetries}`);
  console.log(`📊 共收集 ${allCandidates.length} 个候选项目\n`);

  if (allCandidates.length === 0) {
    console.error('❌ 未找到任何项目，请检查配置、网络或 GitHub API 限额');
    console.warn('⚠️ 保留上一份 GitHub Radar 数据，不用空结果覆盖现有日报。');
    return;
  }

  // 4. 规则负责硬门槛，Gemini 3.1 Pro 负责最终语义评审。
  allCandidates.sort((a, b) => b.recommendScore - a.recommendScore);

  const poolTargetMet = allCandidates.length >= radarConfig.candidateTarget;
  const selection = poolTargetMet
    ? await selectGithubRecommendations(allCandidates, radarConfig, runtime.profile, token)
    : { qualified: [], hardGatePassed: allCandidates.filter(project => assessHardGate(project).passed).length, geminiReviewed: 0, geminiSucceeded: 0 };
  const qualifiedCandidates = selection.qualified;
  const recommendations = qualifiedCandidates.slice(0, radarConfig.maxItems);
  const topPick = recommendations[0] || null;
  const selectedProjects = recommendations.slice(1);
  const watchProjects = [];
  console.log(`严格筛选：${allCandidates.length} 个候选，${qualifiedCandidates.length} 个达标，输出 ${recommendations.length} 个（最多 ${radarConfig.maxItems} 个）`);

  // 不推荐项目（分数最低的，但需要有理由）
  // 日报只输出通过门槛的推荐项目，不展示候选或淘汰项目。
  const notRecommended = [];

  // 5. 生成输出文件
  Object.assign(searchStats, {
    candidateTarget: radarConfig.candidateTarget,
    candidateTargetMet: poolTargetMet,
    hardGatePassed: selection.hardGatePassed,
    geminiReviewed: selection.geminiReviewed,
    geminiSucceeded: selection.geminiSucceeded
  });
  await generateAndSaveOutputs(config, source, selectedProjects, watchProjects, notRecommended, allCandidates, topPick, searchStats, qualifiedCandidates.length);

  console.log('\n✅ 每日搜索完成！');
}

function assessQuality(project, minScore = 85) {
  const hard = assessHardGate(project);
  const failures = [...hard.failures];
  if (project.recommendScore < minScore) failures.unshift(`综合分低于 ${minScore}`);
  return { passed: failures.length === 0, threshold: minScore, relevanceSignals: hard.relevanceSignals, failures };
}

function assessHardGate(project) {
  const failures = [];
  if (project.archived) failures.push('仓库已归档');
  if (!project.license || project.license === '未知') failures.push('License 不明确');
  if (!project.description || project.description.trim().length < 30) failures.push('项目描述信息不足');
  const updatedAt = new Date(project.updatedAt);
  const ageDays = (Date.now() - updatedAt.getTime()) / 86400000;
  if (!Number.isFinite(ageDays) || ageDays > 365) failures.push('超过一年未更新');
  if ((project.penalties || []).some(item => item.includes('命中黑名单'))) failures.push('命中用户明确排除方向');

  // 至少一个核心价值维度达到其权重的 60%，避免只靠语言、Star 或关键词加分入选。
  const coreDimensions = ['vibeCodingLearning', 'officeAutomation', 'monetizationPotential', 'codexFriendly'];
  const weights = { vibeCodingLearning: 20, officeAutomation: 20, monetizationPotential: 15, codexFriendly: 15 };
  if (!coreDimensions.some(key => (project.scores[key] || 0) >= weights[key] * 0.6)) {
    failures.push('核心价值维度不足');
  }

  const text = `${project.name} ${project.description}`.toLowerCase();
  const strongSignals = [
    'ai agent', 'agentic', 'tool calling', 'codex', 'claude code', 'developer tool', 'repo analyzer',
    'office automation', 'word automation', 'excel automation', 'powerpoint automation', 'pdf automation',
    'docx', 'xlsx', 'pptx', 'document workflow', 'batch document', 'report generator',
    'workflow automation', 'task automation', 'automation tool', 'productivity app', 'local first',
    'knowledge management', 'reading assistant', 'personal crm', 'micro saas', 'invoice generator',
    'resume generator', 'proposal generator', 'form automation', 'data cleaning tool'
  ];
  const relevanceSignals = strongSignals.filter(signal => text.includes(signal));
  if (relevanceSignals.length === 0) failures.push('名称和描述未命中强相关主题');

  return { passed: failures.length === 0, relevanceSignals, failures };
}

const EMAIL_AUTOMATION_TERMS = [
  'email automation', 'gmail automation', 'automated email', 'cold email',
  'email marketing', 'newsletter automation', 'mail merge', 'outreach automation',
  '邮件自动化', '自动发邮件', '群发邮件', '邮件营销'
];

function hasExcludedEmailAutomation(project, readme = '') {
  const text = `${project.name || ''} ${project.description || ''} ${readme}`.toLowerCase();
  return EMAIL_AUTOMATION_TERMS.some(term => text.includes(term));
}

async function fetchGithubReadme(fullName, token) {
  const headers = { Accept: 'application/vnd.github.raw+json', 'User-Agent': 'vibe-coding-github-radar' };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(`${GITHUB_API}/repos/${fullName}/readme`, { headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) return '';
    return (await response.text()).slice(0, 12000);
  } catch { return ''; }
}

async function selectGithubRecommendations(candidates, radarConfig, profile, token, options = {}) {
  const reviewer = options.reviewer || reviewCandidate;
  const readmeFetcher = options.readmeFetcher || fetchGithubReadme;
  const hardEligible = candidates.filter(project => {
    project.qualityGate = assessHardGate(project);
    return project.qualityGate.passed;
  }).sort((a, b) => b.recommendScore - a.recommendScore);
  const reviewLimit = radarConfig.geminiReviewLimit || 10;
  const qualified = [];
  let geminiSucceeded = 0;
  for (const project of hardEligible.slice(0, reviewLimit)) {
    const readmeEvidence = await readmeFetcher(project.fullName, token);
    if (hasExcludedEmailAutomation(project, readmeEvidence)) {
      project.qualityGate = { passed: false, relevanceSignals: [], failures: ['属于用户暂不感兴趣的自动化邮件类'] };
      continue;
    }
    const result = radarConfig.useGeminiReview
      ? await reviewer({ ...project, readmeEvidence: readmeEvidence || 'README unavailable' }, 'Vibe Coding / GitHub Radar', profile, radarConfig)
      : { status: 'unavailable', provider: null };
    if (result.status === 'success') {
      geminiSucceeded += 1;
      if (!result.review.shouldRecommend || result.review.score < radarConfig.minScore) continue;
      qualified.push({ ...project, ruleScore: project.recommendScore, recommendScore: result.review.score,
        semanticReview: result.review, reviewProvider: result.provider,
        vibeCodingValue: result.review.valueForRafael || project.vibeCodingValue,
        codexFriendly: result.review.codexIntegrationPotential || project.codexFriendly });
    } else if (assessQuality(project, radarConfig.minScore).passed) {
      qualified.push({ ...project, ruleScore: project.recommendScore, reviewProvider: 'rules-fallback' });
    }
  }
  return { qualified: qualified.sort((a, b) => b.recommendScore - a.recommendScore), hardGatePassed: hardEligible.length,
    geminiReviewed: Math.min(hardEligible.length, reviewLimit), geminiSucceeded };
}

/**
 * 调用 GitHub Search API
 */
async function searchGitHub(query, token, options = {}) {
  const page = options.page || 1;
  const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${PER_PAGE}&page=${page}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'vibe-coding-github-radar'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchImpl = options.fetchImpl || fetch;
  const sleepImpl = options.sleepImpl || sleep;
  const maxAttempts = options.maxAttempts || 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetchImpl(url, { headers });
    const remaining = Number(res.headers.get('x-ratelimit-remaining'));
    const reset = Number(res.headers.get('x-ratelimit-reset'));
    if ([403, 429].includes(res.status)) {
      if (attempt === maxAttempts) throw new Error(`GitHub Search API 限流，重试 ${maxAttempts} 次后仍未恢复`);
      const waitMs = Number.isFinite(reset) && reset > 0 ? Math.max(1000, reset * 1000 - Date.now() + 1500) : 65000;
      console.warn(`  ⏳ GitHub Search API 限流，等待 ${Math.ceil(waitMs / 1000)} 秒后自动重试（${attempt}/${maxAttempts - 1}）`);
      if (options.onRetry) options.onRetry({ attempt, waitMs });
      await sleepImpl(waitMs);
      continue;
    }
    if (!res.ok) throw new Error(`GitHub API 返回 ${res.status}: ${res.statusText}`);
    const data = await res.json();
    // 用完本分钟搜索额度时主动等到重置，避免后续雷达立刻撞限流。
    if (remaining === 0 && Number.isFinite(reset) && reset > 0) {
      const waitMs = Math.max(1000, reset * 1000 - Date.now() + 1500);
      console.warn(`  ⏳ GitHub Search API 本周期额度已用完，主动等待 ${Math.ceil(waitMs / 1000)} 秒`);
      await sleepImpl(waitMs);
    }
    return data.items || [];
  }
  return [];
}

/**
 * 规范化仓库对象
 */
function normalizeRepo(repo, scoreResult, area) {
  return {
    name: repo.name,
    fullName: repo.full_name,
    url: repo.html_url,
    description: repo.description || '',
    author: repo.owner ? repo.owner.login : (repo.full_name ? repo.full_name.split('/')[0] : '-'),
    language: repo.language || '未知',
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    license: repo.license ? (repo.license.spdx_id || repo.license.name || '未知') : '未知',
    updatedAt: repo.pushed_at ? repo.pushed_at.slice(0, 10) : (repo.updated_at ? repo.updated_at.slice(0, 10) : '-'),
    archived: repo.archived || false,
    openIssues: repo.open_issues_count || 0,
    recommendScore: scoreResult.recommendScore,
    rawRecommendScore: scoreResult.rawRecommendScore,
    scores: scoreResult.scores,
    scoreBasis: scoreResult.scoreBasis,
    vibeCodingValue: scoreResult.vibeCodingValue,
    officeAutomationValue: scoreResult.officeAutomationValue,
    monetizationPotential: scoreResult.monetizationPotential,
    codexFriendly: scoreResult.codexFriendly,
    riskPoints: scoreResult.riskPoints,
    matchedArea: area ? area.name : '综合',
    penalties: scoreResult.penalties,
    bonuses: scoreResult.bonuses
  };
}

/**
 * 生成并保存所有输出文件
 */
async function generateAndSaveOutputs(config, source, selectedProjects, watchProjects, notRecommended, allCandidates, topPick, searchStats, qualifiedCount) {
  const date = new Date().toISOString().slice(0, 10);
  const enabledAreas = (config.enabledFocusAreas || []).filter(a => a.enabled);

  // 生成总结
  const summary = generateSummary(topPick, config, searchStats, allCandidates.length);

  // 生成明日方向建议
  const tomorrowDirections = generateTomorrowDirections(config, enabledAreas);

  // 生成 Codex 提示词
  const codexPrompt = topPick ? generateCodexPrompt(topPick, date) : '今日暂无推荐项目，请调整配置后重试。';

  // 生成 Markdown 模板
  const markdownTemplate = topPick ? generateMarkdownTemplate(topPick, date) : '';

  // ===== 生成 data/latest.json =====
  const latestData = {
    date,
    summary,
    activeProfile: config.profileName,
    activeFocusAreas: enabledAreas.map(a => a.name),
    scoringWeights: config.scoringWeights,
    screening: { ...searchStats, candidateCount: allCandidates.length, qualifiedCount },
    topPick: topPick || null,
    selectedProjects,
    watchProjects,
    notRecommendedProjects: notRecommended,
    codexPrompt,
    markdownTemplate,
    tomorrowDirections,
    configSource: source,
    updatedAt: new Date().toISOString()
  };

  const dataDir = path.join(process.cwd(), 'data');
  ensureDir(dataDir);
  fs.writeFileSync(path.join(dataDir, 'latest.json'), JSON.stringify(latestData, null, 2));
  console.log(`📝 已生成 data/latest.json`);

  // ===== 更新 data/history.json =====
  const historyPath = path.join(dataDir, 'history.json');
  let historyData = { history: [], updatedAt: new Date().toISOString() };
  if (fs.existsSync(historyPath)) {
    try {
      historyData = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
    } catch (e) {
      console.warn('⚠️ history.json 解析失败，将重新创建');
    }
  }

  // 添加今日记录
  const historyEntry = {
    date,
    topPick: topPick ? {
      name: topPick.name,
      fullName: topPick.fullName,
      url: topPick.url,
      recommendScore: topPick.recommendScore
    } : null,
    selectedProjects: selectedProjects.map(p => ({
      name: p.name,
      fullName: p.fullName,
      url: p.url,
      recommendScore: p.recommendScore
    })),
    profileName: config.profileName,
    focusAreas: enabledAreas.map(a => a.name),
    summary
  };

  // 去重：如果同一天已有记录则替换
  historyData.history = historyData.history.filter(h => h.date !== date);
  historyData.history.push(historyEntry);

  // 只保留最近 90 天
  if (historyData.history.length > 90) {
    historyData.history = historyData.history.slice(-90);
  }

  historyData.updatedAt = new Date().toISOString();
  fs.writeFileSync(historyPath, JSON.stringify(historyData, null, 2));
  console.log(`📝 已更新 data/history.json（共 ${historyData.history.length} 条记录）`);

  // ===== 生成 reports/YYYY-MM-DD_VibeCoding_GitHub学习日报.md =====
  const reportDir = path.join(process.cwd(), 'reports');
  ensureDir(reportDir);
  const reportContent = generateReport({
    date,
    config,
    source,
    topPick,
    selectedProjects,
    watchProjects,
    notRecommendedProjects: notRecommended,
    tomorrowDirections,
    summary
  });
  const reportFilename = `${date}_VibeCoding_GitHub学习日报.md`;
  fs.writeFileSync(path.join(reportDir, reportFilename), reportContent);
  console.log(`📝 已生成 reports/${reportFilename}`);

  // 打印结果摘要
  console.log('\n======== 结果摘要 ========');
  console.log(`日期：${date}`);
  console.log(`画像：${config.profileName}`);
  if (topPick) {
    console.log(`精读项目：${topPick.name} (${topPick.recommendScore} 分)`);
  }
  console.log(`精选项目：${selectedProjects.length} 个`);
  console.log(`观察项目：${watchProjects.length} 个`);
  console.log(`不推荐：${notRecommended.length} 个`);
  console.log('============================\n');
}

/**
 * 生成总结
 */
function generateSummary(topPick, config, searchStats = { complete: true }, candidateCount = 0) {
  if (!topPick && !searchStats.complete) return `GitHub 搜索未完整完成：${searchStats.succeeded || 0}/${searchStats.taskCount || 0} 个任务成功，当前结果不足以判断，已明确标记而不假装“无推荐”。`;
  if (!topPick && searchStats.candidateTarget && candidateCount < searchStats.candidateTarget) return `GitHub 仅收集到 ${candidateCount}/${searchStats.candidateTarget} 个真实候选，候选池未达标，本次不假装完成筛选。`;
  if (!topPick) return `已完整筛选 ${candidateCount} 个候选项目，今日没有达到严格质量门槛的项目，已跳过，不硬凑。`;
  const summary = `今天最值得精读的项目是 **${topPick.name}**（推荐分 ${topPick.recommendScore || 0}）。`;
  const reason = topPick.vibeCodingValue || '它有较高的 Vibe Coding 学习价值';
  const office = topPick.officeAutomationValue || '';
  const monetization = topPick.monetizationPotential || '';
  let value = '';
  if (office && office.includes('高')) value += '对办公自动化有直接价值。';
  if (monetization && monetization.includes('高')) value += '有个人变现潜力。';
  if (!value) value = '可以接触新鲜有趣的技术和项目组织方式。';
  return `${summary}${reason}。${value}建议用 30-45 分钟只读学习，不要安装运行，先理解核心机制和可迁移经验。`;
}

/**
 * 生成明日方向建议
 */
function generateTomorrowDirections(config, enabledAreas) {
  const directions = [];
  // 基于当前启用的方向给出建议
  for (const area of enabledAreas.slice(0, 3)) {
    switch (area.id) {
      case 'office_automation':
        directions.push('办公自动化：继续深挖 Word/Excel/PDF 生成库，关注模板填充和批量处理');
        break;
      case 'vibe_monetization':
        directions.push('变现工具：关注可包装成模板服务或 SaaS 的小工具');
        break;
      case 'codex_friendly':
        directions.push('Codex 改造：寻找结构更清晰、更适合拆解的入门项目');
        break;
      case 'fun_interesting':
        directions.push('新鲜有趣：关注个人知识库、数据可视化等有启发性的工具');
        break;
      case 'personal_efficiency':
        directions.push('效率工具：关注笔记、知识管理、自动化流程类项目');
        break;
      case 'local_first':
        directions.push('本地工具：关注不依赖服务器的离线工具和桌面应用');
        break;
      case 'pwa_webapp':
        directions.push('Web/PWA：关注移动端可用、可离线的 Web 应用');
        break;
      default:
        directions.push(`${area.name}：继续探索此方向的高质量项目`);
    }
  }
  if (directions.length < 3) {
    directions.push('尝试切换需求画像模板，探索新的方向');
  }
  return directions.slice(0, 3);
}

/**
 * 确保目录存在
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ 运行失败:', err);
    process.exit(1);
  });
}

module.exports = { main, assessQuality, assessHardGate, searchGitHub, generateSummary, selectGithubRecommendations, fetchGithubReadme, hasExcludedEmailAutomation };
