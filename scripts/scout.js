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

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(`[${i + 1}/${tasks.length}] 搜索: ${task.query.substring(0, 80)}...`);

    try {
      const repos = await searchGitHub(task.query, token);
      console.log(`  → 找到 ${repos.length} 个结果`);

      for (const repo of repos) {
        // 去重
        if (seenRepos.has(repo.full_name)) continue;
        seenRepos.add(repo.full_name);

        // 屏蔽项目
        if (blockedRepos.has(repo.full_name)) {
          console.log(`  → 跳过屏蔽项目: ${repo.full_name}`);
          continue;
        }

        // 评分
        const scoreResult = scoreProject(repo, config, task.area);
        const normalized = normalizeRepo(repo, scoreResult, task.area);
        allCandidates.push(normalized);
      }

      // 限流延迟
      if (i < tasks.length - 1) {
        await sleep(RATE_LIMIT_DELAY);
      }
    } catch (e) {
      console.error(`  ❌ 搜索失败: ${e.message}`);
      // 继续下一个搜索任务
    }
  }

  console.log(`\n📊 共收集 ${allCandidates.length} 个候选项目\n`);

  if (allCandidates.length === 0) {
    console.error('❌ 未找到任何项目，请检查配置或网络');
    // 仍然生成一个空的日报
    await generateAndSaveOutputs(config, source, [], [], [], [], null);
    return;
  }

  // 4. 排序并分类
  allCandidates.sort((a, b) => b.recommendScore - a.recommendScore);

  // Top Pick（最高分）
  const topPick = allCandidates[0];

  // 精选项目（第 2-4 名）
  const selectedProjects = allCandidates.slice(1, 4);

  // 观察项目（第 5-9 名）
  const watchProjects = allCandidates.slice(4, 9);

  // 不推荐项目（分数最低的，但需要有理由）
  const notRecommended = allCandidates
    .filter(p => p.recommendScore < 40 || p.archived || !p.license || p.license === '未知')
    .slice(-3)
    .map(p => ({
      name: p.name,
      fullName: p.fullName,
      url: p.url,
      reason: p.riskPoints || '推荐分过低'
    }));

  // 5. 生成输出文件
  await generateAndSaveOutputs(config, source, selectedProjects, watchProjects, notRecommended, allCandidates, topPick);

  console.log('\n✅ 每日搜索完成！');
}

/**
 * 调用 GitHub Search API
 */
async function searchGitHub(query, token) {
  const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${PER_PAGE}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'vibe-coding-github-radar'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });

  if (res.status === 403) {
    // Rate limit
    const reset = res.headers.get('x-ratelimit-reset');
    console.error(`  ⚠️ API 限流！重置时间: ${reset ? new Date(parseInt(reset) * 1000).toLocaleString() : '未知'}`);
    throw new Error('GitHub API 限流，请配置 GITHUB_TOKEN 或稍后再试');
  }

  if (!res.ok) {
    throw new Error(`GitHub API 返回 ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return data.items || [];
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
    scores: scoreResult.scores,
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
async function generateAndSaveOutputs(config, source, selectedProjects, watchProjects, notRecommended, allCandidates, topPick) {
  const date = new Date().toISOString().slice(0, 10);
  const enabledAreas = (config.enabledFocusAreas || []).filter(a => a.enabled);

  // 生成总结
  const summary = generateSummary(topPick, config);

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
function generateSummary(topPick, config) {
  if (!topPick) return '今日暂无推荐项目。请检查 GitHub Actions 是否正常运行，或调整需求画像配置。';
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

// 运行主函数
main().catch(err => {
  console.error('❌ 运行失败:', err);
  process.exit(1);
});
