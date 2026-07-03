/* ===== api.js - 数据加载模块 =====
 * 负责从 data/ 和 config/ 目录加载 JSON 数据
 * 纯前端 fetch，无后端依赖
 */
const Api = {
  latestData: null,
  historyData: null,
  configData: null,
  defaultConfigData: null,

  /**
   * 加载所有数据（并发加载）
   */
  async loadAll() {
    try {
      const [latest, history, config, defaultConfig] = await Promise.all([
        this.fetchJson('data/latest.json'),
        this.fetchJson('data/history.json'),
        this.fetchJson('config/focus.json').catch(() => null),
        this.fetchJson('config/default-focus.json').catch(() => null)
      ]);
      this.latestData = latest;
      this.historyData = history;
      this.configData = config || defaultConfig;
      this.defaultConfigData = defaultConfig || config;
      return { latest, history, config: this.configData, defaultConfig: this.defaultConfigData };
    } catch (e) {
      console.error('加载数据失败:', e);
      throw e;
    }
  },

  /**
   * 通用 fetch JSON 工具，带缓存破坏参数
   */
  async fetchJson(path) {
    const url = path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now();
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`加载 ${path} 失败: ${res.status}`);
    return res.json();
  },

  /**
   * 加载单个 Markdown 报告文件
   */
  async fetchText(path) {
    const res = await fetch(path + '?_t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`加载 ${path} 失败: ${res.status}`);
    return res.text();
  },

  /**
   * 获取 reports 目录下的报告列表
   * GitHub Pages 无法列目录，所以我们从 history.json 推断报告文件名
   */
  getReportList() {
    if (!this.historyData || !this.historyData.history) return [];
    return this.historyData.history.map(item => ({
      date: item.date,
      filename: item.date + '_VibeCoding_GitHub学习日报.md',
      path: 'reports/' + item.date + '_VibeCoding_GitHub学习日报.md',
      topPick: item.topPick ? item.topPick.name : '-',
      profileName: item.profileName || '-'
    })).reverse();
  },

  /**
   * 获取所有历史项目（去重）
   */
  getAllHistoricalProjects() {
    const projects = [];
    const seen = new Set();
    if (!this.historyData || !this.historyData.history) return projects;

    this.historyData.history.forEach(day => {
      if (day.topPick) {
        const key = day.topPick.fullName || day.topPick.name;
        if (!seen.has(key)) {
          seen.add(key);
          projects.push(this.normalizeProject(day.topPick, day.date, 'topPick'));
        }
      }
      if (day.selectedProjects) {
        day.selectedProjects.forEach(p => {
          const key = p.fullName || p.name;
          if (!seen.has(key)) {
            seen.add(key);
            projects.push(this.normalizeProject(p, day.date, 'selected'));
          }
        });
      }
    });
    // 也加入今天的项目
    if (this.latestData) {
      if (this.latestData.topPick) {
        const key = this.latestData.topPick.fullName || this.latestData.topPick.name;
        if (!seen.has(key)) {
          seen.add(key);
          projects.push(this.normalizeProject(this.latestData.topPick, this.latestData.date, 'topPick'));
        }
      }
      if (this.latestData.selectedProjects) {
        this.latestData.selectedProjects.forEach(p => {
          const key = p.fullName || p.name;
          if (!seen.has(key)) {
            seen.add(key);
            projects.push(this.normalizeProject(p, this.latestData.date, 'selected'));
          }
        });
      }
      if (this.latestData.watchProjects) {
        this.latestData.watchProjects.forEach(p => {
          const key = p.fullName || p.name;
          if (!seen.has(key)) {
            seen.add(key);
            projects.push(this.normalizeProject(p, this.latestData.date, 'watch'));
          }
        });
      }
    }
    return projects;
  },

  /**
   * 规范化项目对象，确保字段一致
   */
  normalizeProject(p, date, source) {
    return {
      name: p.name || '-',
      fullName: p.fullName || p.name || '-',
      url: p.url || '',
      description: p.description || '',
      author: p.author || (p.fullName ? p.fullName.split('/')[0] : '-'),
      language: p.language || '-',
      stars: p.stars || 0,
      forks: p.forks || 0,
      license: p.license || '未知',
      updatedAt: p.updatedAt || '-',
      archived: p.archived || false,
      openIssues: p.openIssues || 0,
      recommendScore: p.recommendScore || 0,
      scores: p.scores || {},
      vibeCodingValue: p.vibeCodingValue || p.vibeCoding || '-',
      officeAutomationValue: p.officeAutomationValue || p.officeAutomation || '-',
      monetizationPotential: p.monetizationPotential || p.monetization || '-',
      codexFriendly: p.codexFriendly || '-',
      riskPoints: p.riskPoints || p.risk || '-',
      date: date,
      source: source
    };
  },

  /**
   * 获取配置中所有关键词数量
   */
  getKeywordCount(config) {
    if (!config || !config.enabledFocusAreas) return 0;
    return config.enabledFocusAreas.reduce((sum, area) => {
      return sum + (area.keywords ? area.keywords.length : 0);
    }, 0);
  },

  /**
   * 获取启用的关注方向
   */
  getEnabledFocusAreas(config) {
    if (!config || !config.enabledFocusAreas) return [];
    return config.enabledFocusAreas.filter(a => a.enabled);
  }
};
