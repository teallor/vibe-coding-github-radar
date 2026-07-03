/**
 * keywords.js - 关键词管理模块
 * GitHub Actions 脚本，根据配置生成 GitHub 搜索关键词
 *
 * 不写死关键词，从 config/focus.json 读取启用的 focus areas 生成搜索词
 */

/**
 * 根据配置生成搜索关键词列表
 * @param {object} config - 配置对象
 * @returns {Array<{area: object, queries: string[]}>} 每个 focus area 的搜索词
 */
function generateSearchQueries(config) {
  const enabledAreas = (config.enabledFocusAreas || []).filter(a => a.enabled);
  const results = [];

  for (const area of enabledAreas) {
    const queries = [];
    const keywords = area.keywords || [];
    const excludeKeywords = area.excludeKeywords || [];

    // 每个关键词生成一个搜索 query
    // GitHub Search API 的 q 参数格式：keyword in:name,description,readme
    for (const kw of keywords) {
      let q = `${kw} in:name,description,readme`;
      // 排除关键词
      if (excludeKeywords.length > 0) {
        // 只取前 2 个排除词，避免 query 过长
        const excludes = excludeKeywords.slice(0, 2);
        for (const ex of excludes) {
          q += ` NOT ${ex}`;
        }
      }
      queries.push(q);
    }

    results.push({ area, queries });
  }

  return results;
}

/**
 * 为搜索添加通用过滤条件
 * @param {string} baseQuery - 基础搜索词
 * @param {object} area - focus area 配置
 * @param {object} config - 全局配置
 * @returns {string} 完整的搜索 query
 */
function buildFullQuery(baseQuery, area, config) {
  let q = baseQuery;

  // 最低 Star
  if (area.minStars && area.minStars > 0) {
    q += ` stars:>=${area.minStars}`;
  }

  // 更新时间范围
  if (area.updatedWithinMonths && area.updatedWithinMonths > 0) {
    const date = new Date();
    date.setMonth(date.getMonth() - area.updatedWithinMonths);
    const dateStr = date.toISOString().slice(0, 10);
    q += ` pushed:>=${dateStr}`;
  }

  // 优先语言（如果有配置）
  const priorityLangs = config.priorityLanguages || [];
  if (priorityLangs.length > 0 && priorityLangs.length <= 3) {
    // GitHub search 不支持 OR in language，我们按语言分别搜索
    // 这里先不加 language 过滤，在结果中再筛选
  }

  // 排除 archived（GitHub search API 不直接支持，在结果中过滤）
  // 排除黑名单关键词
  const blacklist = config.blacklistKeywords || [];
  if (blacklist.length > 0) {
    // 只加前 3 个黑名单词到 query
    for (const bl of blacklist.slice(0, 3)) {
      q += ` NOT ${bl}`;
    }
  }

  return q;
}

/**
 * 生成所有需要执行的搜索任务
 * @param {object} config
 * @returns {Array<{area: object, query: string, language: string|null}>}
 */
function generateSearchTasks(config) {
  const areaQueries = generateSearchQueries(config);
  const tasks = [];
  for (const { area, queries } of areaQueries) {
    // 每个方向取前 N 个关键词，每个关键词只搜索一次。
    // 旧实现按三种语言重复搜索，5 个方向会产生 90 次请求，超过
    // GitHub Search API 每分钟限额；语言偏好改由评分阶段处理。
    const maxKeywordsPerArea = 6;
    const limitedQueries = queries.slice(0, maxKeywordsPerArea);

    for (const baseQuery of limitedQueries) {
      const fullQuery = buildFullQuery(baseQuery, area, config);
      tasks.push({ area, query: fullQuery, language: null });
    }
  }

  return tasks;
}

module.exports = { generateSearchQueries, buildFullQuery, generateSearchTasks };
