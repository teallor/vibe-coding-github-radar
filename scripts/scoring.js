/**
 * scoring.js - 评分系统模块
 * GitHub Actions 脚本，根据配置权重计算项目分数
 *
 * 评分权重从 config/focus.json 读取，不写死
 * scoring.js 只提供默认 fallback 和评分逻辑
 */

/**
 * 计算单个项目的推荐分和各维度分数
 * @param {object} repo - GitHub API 返回的仓库对象
 * @param {object} config - 配置对象
 * @param {object} area - 匹配到的 focus area
 * @returns {object} 评分结果
 */
function scoreProject(repo, config, area) {
  const weights = config.scoringWeights || {
    vibeCodingLearning: 20,
    officeAutomation: 20,
    monetizationPotential: 15,
    codexFriendly: 15,
    beginnerFriendly: 10,
    localFirst: 10,
    activity: 5,
    license: 5
  };

  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0) || 100;

  // 计算各维度得分（0-100 的百分比，再乘以权重）
  const scores = {
    vibeCodingLearning: calcVibeCodingScore(repo, area) * weights.vibeCodingLearning / 100,
    officeAutomation: calcOfficeScore(repo) * weights.officeAutomation / 100,
    monetizationPotential: calcMonetizationScore(repo, area) * weights.monetizationPotential / 100,
    codexFriendly: calcCodexScore(repo) * (weights.codexFriendly || 0) / 100,
    beginnerFriendly: calcBeginnerScore(repo) * (weights.beginnerFriendly || 0) / 100,
    localFirst: calcLocalScore(repo) * (weights.localFirst || 0) / 100,
    activity: calcActivityScore(repo) * (weights.activity || 0) / 100,
    license: calcLicenseScore(repo) * (weights.license || 0) / 100
  };

  // 额外维度（用户可能自定义新增的）
  for (const key of Object.keys(weights)) {
    if (!scores.hasOwnProperty(key)) {
      scores[key] = 50 * weights[key] / 100; // 默认中等
    }
  }

  // 基础推荐分 = 各维度加权总分
  let recommendScore = Math.round(Object.values(scores).reduce((s, v) => s + v, 0));

  // ===== 扣分规则 =====
  const penalties = [];

  // 1. archived 仓库大幅扣分
  if (repo.archived) {
    recommendScore -= 30;
    penalties.push('已归档（archived），扣 30 分');
  }

  // 2. 18个月以上无更新扣分
  const updatedAt = new Date(repo.pushed_at || repo.updated_at || 0);
  const monthsSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsSinceUpdate > 18) {
    const deduction = Math.min(20, Math.floor((monthsSinceUpdate - 18) / 6) * 5);
    recommendScore -= deduction;
    penalties.push(`${Math.floor(monthsSinceUpdate)} 个月未更新，扣 ${deduction} 分`);
  }

  // 3. 无 License 扣分
  if (!repo.license) {
    recommendScore -= 10;
    penalties.push('无 License，扣 10 分');
  }

  // 4. README 太短扣分（通过 description 判断）
  if (!repo.description || repo.description.length < 10) {
    recommendScore -= 5;
    penalties.push('描述/README 过短，扣 5 分');
  }

  // 5. 明显依赖付费 API 扣分
  const desc = ((repo.description || '') + ' ' + (repo.name || '')).toLowerCase();
  const paidApiHints = ['paid api', 'stripe', 'openai key required', 'requires api key', 'paid service'];
  if (paidApiHints.some(h => desc.includes(h))) {
    recommendScore -= 15;
    penalties.push('可能依赖付费 API，扣 15 分');
  }

  // 6. 明显要求复杂云部署扣分
  const cloudHints = ['kubernetes', 'docker-compose cluster', 'aws lambda', 'gcp', 'terraform'];
  if (cloudHints.some(h => desc.includes(h))) {
    recommendScore -= 10;
    penalties.push('可能需要复杂云部署，扣 10 分');
  }

  // 7. Star 过高但可能过工程化（>50000 star 的项目可能太复杂）
  if (repo.stargazers_count > 50000) {
    recommendScore -= 5;
    penalties.push('Star 过高可能过工程化，扣 5 分');
  }

  // 8. 黑名单关键词扣分
  const blacklist = config.blacklistKeywords || [];
  if (blacklist.some(b => desc.includes(b.toLowerCase()))) {
    recommendScore -= 40;
    penalties.push('命中黑名单关键词，扣 40 分');
  }

  // ===== 加分规则 =====
  const bonuses = [];

  // 白名单关键词加分
  const whitelist = config.whitelistKeywords || [];
  const whitelistHits = whitelist.filter(w => desc.includes(w.toLowerCase()));
  if (whitelistHits.length > 0) {
    const bonus = Math.min(10, whitelistHits.length * 2);
    recommendScore += bonus;
    bonuses.push(`命中白名单 ${whitelistHits.length} 个，加 ${bonus} 分`);
  }

  // 优先语言加分
  const priorityLangs = config.priorityLanguages || [];
  if (priorityLangs.includes(repo.language)) {
    recommendScore += 5;
    bonuses.push(`优先语言 ${repo.language}，加 5 分`);
  }

  // 优先 owner 加分
  const priorityOwners = config.priorityOwners || [];
  const owner = repo.full_name ? repo.full_name.split('/')[0] : '';
  if (priorityOwners.includes(owner)) {
    recommendScore += 10;
    bonuses.push(`优先 owner ${owner}，加 10 分`);
  }

  // 限制在 0-100
  recommendScore = Math.max(0, Math.min(100, recommendScore));

  return {
    recommendScore,
    scores: roundScores(scores),
    penalties,
    bonuses,
    vibeCodingValue: describeVibeCoding(repo, area),
    officeAutomationValue: describeOffice(repo),
    monetizationPotential: describeMonetization(repo, area),
    codexFriendly: describeCodex(repo),
    riskPoints: describeRisks(repo, penalties)
  };
}

// ===== 各维度评分逻辑（返回 0-100 百分比）=====

function calcVibeCodingScore(repo, area) {
  let score = 50;
  // 适合学习的特征
  if (repo.description && repo.description.length > 30) score += 15;
  if (repo.stargazers_count > 50) score += 10;
  if (repo.stargazers_count > 500) score += 5;
  if (repo.language === 'Python' || repo.language === 'JavaScript') score += 10;
  if (repo.fork === false) score += 5;
  // 小到中型项目更适合学习
  if (repo.size && repo.size < 5000) score += 10;
  return Math.min(100, score);
}

function calcOfficeScore(repo) {
  const text = ((repo.description || '') + ' ' + (repo.name || '')).toLowerCase();
  const officeKeywords = ['office', 'word', 'excel', 'pptx', 'powerpoint', 'pdf', 'docx', 'xlsx', 'document', 'spreadsheet', 'template', 'report'];
  const hits = officeKeywords.filter(k => text.includes(k));
  let score = 20 + hits.length * 15;
  if (hits.length === 0) score = 15;
  return Math.min(100, score);
}

function calcMonetizationScore(repo, area) {
  const text = ((repo.description || '') + ' ' + (repo.name || '')).toLowerCase();
  const monetizationKeywords = ['saas', 'tool', 'generator', 'invoice', 'resume', 'product', 'service', 'automation', 'template'];
  const hits = monetizationKeywords.filter(k => text.includes(k));
  let score = 30 + hits.length * 12;
  if (area && area.id === 'vibe_monetization') score += 20;
  return Math.min(100, score);
}

function calcCodexScore(repo) {
  const text = ((repo.description || '') + ' ' + (repo.name || '')).toLowerCase();
  const codexKeywords = ['starter', 'simple', 'cli', 'flask', 'streamlit', 'fastapi', 'example', 'template', 'boilerplate'];
  const hits = codexKeywords.filter(k => text.includes(k));
  let score = 40 + hits.length * 12;
  // 小项目更适合 Codex 改造
  if (repo.size && repo.size < 2000) score += 15;
  if (repo.stargazers_count > 10 && repo.stargazers_count < 5000) score += 10;
  return Math.min(100, score);
}

function calcBeginnerScore(repo) {
  let score = 50;
  if (repo.description && repo.description.length > 50) score += 15;
  if (repo.stargazers_count > 100) score += 10; // 有一定 star 说明文档可能更好
  const text = ((repo.description || '') + ' ' + (repo.name || '')).toLowerCase();
  if (text.includes('beginner') || text.includes('tutorial') || text.includes('simple') || text.includes('easy')) score += 20;
  if (repo.size && repo.size < 3000) score += 10;
  return Math.min(100, score);
}

function calcLocalScore(repo) {
  const text = ((repo.description || '') + ' ' + (repo.name || '')).toLowerCase();
  let score = 50;
  const localKeywords = ['local', 'offline', 'desktop', 'standalone', 'no backend', 'cli'];
  const hits = localKeywords.filter(k => text.includes(k));
  score += hits.length * 10;
  // 排除明显需要服务器的
  const serverKeywords = ['server', 'cloud', 'deploy', 'docker', 'kubernetes'];
  const serverHits = serverKeywords.filter(k => text.includes(k));
  score -= serverHits.length * 10;
  return Math.max(0, Math.min(100, score));
}

function calcActivityScore(repo) {
  const updatedAt = new Date(repo.pushed_at || repo.updated_at || 0);
  const monthsSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsSinceUpdate < 3) return 100;
  if (monthsSinceUpdate < 6) return 80;
  if (monthsSinceUpdate < 12) return 60;
  if (monthsSinceUpdate < 18) return 40;
  return 20;
}

function calcLicenseScore(repo) {
  if (!repo.license) return 0;
  const spdx = repo.license.spdx_id || '';
  if (['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense'].includes(spdx)) return 100;
  if (['GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'MPL-2.0'].includes(spdx)) return 70;
  if (spdx === 'NOASSERTION' || spdx === 'Other') return 40;
  return 60;
}

// ===== 描述生成 =====

function describeVibeCoding(repo, area) {
  const lang = repo.language || '未知语言';
  const stars = repo.stargazers_count || 0;
  let level = '中';
  if (stars > 500) level = '高';
  if (stars < 50) level = '低';
  return `${level} - ${lang} 项目，${stars} Star，${area ? '属于「' + area.name + '」方向' : '综合推荐'}，适合阅读学习核心机制`;
}

function describeOffice(repo) {
  const text = ((repo.description || '') + ' ' + (repo.name || '')).toLowerCase();
  const officeKeywords = ['office', 'word', 'excel', 'pptx', 'powerpoint', 'pdf', 'docx', 'xlsx', 'document', 'template', 'report'];
  const hits = officeKeywords.filter(k => text.includes(k));
  if (hits.length >= 3) return '极高 - 直接涉及多种文档格式处理';
  if (hits.length >= 1) return `高 - 涉及 ${hits.join(', ')} 相关功能`;
  return '低 - 与办公自动化关系不大，但有通用学习价值';
}

function describeMonetization(repo, area) {
  const text = ((repo.description || '') + ' ' + (repo.name || '')).toLowerCase();
  const monetizationKeywords = ['saas', 'tool', 'generator', 'invoice', 'resume', 'product', 'service', 'automation', 'template'];
  const hits = monetizationKeywords.filter(k => text.includes(k));
  if (area && area.id === 'vibe_monetization') return '中高 - 属于变现方向，可包装成小工具或服务';
  if (hits.length >= 2) return '中 - 可包装成工具或模板服务';
  if (hits.length >= 1) return '低中 - 有一定变现潜力，需要加工';
  return '低 - 暂不适合直接变现，可学习技术';
}

function describeCodex(repo) {
  const text = ((repo.description || '') + ' ' + (repo.name || '')).toLowerCase();
  const codexKeywords = ['starter', 'simple', 'cli', 'flask', 'streamlit', 'fastapi', 'example'];
  const hits = codexKeywords.filter(k => text.includes(k));
  const size = repo.size || 0;
  if (hits.length >= 2 && size < 2000) return '高 - 结构清晰、体积小，适合 Codex 拆解改造';
  if (hits.length >= 1) return '中 - 有入门特征，可尝试 Codex 改造';
  if (size > 10000) return '低 - 项目较大，建议只学习部分模块';
  return '中 - 可阅读学习，改造难度需评估';
}

function describeRisks(repo, penalties) {
  const risks = [];
  if (repo.archived) risks.push('已归档停更');
  if (!repo.license) risks.push('License 不明确，商用需谨慎');
  const updatedAt = new Date(repo.pushed_at || repo.updated_at || 0);
  const monthsSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsSinceUpdate > 18) risks.push(`长期未更新（${Math.floor(monthsSinceUpdate)} 个月）`);
  const desc = ((repo.description || '') + ' ' + (repo.name || '')).toLowerCase();
  if (['paid api', 'stripe', 'requires api key'].some(h => desc.includes(h))) risks.push('可能依赖付费 API');
  if (repo.stargazers_count > 50000) risks.push('项目过大，可能过工程化');
  if (risks.length === 0) risks.push('未发现明显风险');
  return risks.join('；');
}

function roundScores(scores) {
  const rounded = {};
  for (const [k, v] of Object.entries(scores)) {
    rounded[k] = Math.round(v);
  }
  return rounded;
}

module.exports = { scoreProject };
