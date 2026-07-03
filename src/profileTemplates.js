/* ===== profileTemplates.js - 需求画像模板 =====
 * 内置多个需求画像模板，用户可一键切换
 * 每个模板包含完整的 focus areas、评分权重、黑白名单配置
 */
const ProfileTemplates = {
  // 各模板的基础配置
  templates: {
    office: {
      key: 'office',
      name: 'Office 自动化优先',
      icon: 'fa-file-word',
      desc: '重点找 Word、Excel、PPT、PDF、报告生成、批量处理、模板填充',
      profileName: 'Office 自动化优先',
      enabledAreaIds: ['office_automation', 'codex_friendly', 'personal_efficiency'],
      weights: { vibeCodingLearning: 20, officeAutomation: 35, monetizationPotential: 15, codexFriendly: 10, beginnerFriendly: 10, localFirst: 5, activity: 3, license: 2 },
      blacklistAdd: ['paid api only', 'enterprise only'],
      whitelistAdd: ['office', 'excel', 'word', 'pptx', 'pdf', 'docx', 'xlsx', 'template', 'generator']
    },
    monetization: {
      key: 'monetization',
      name: '个人变现优先',
      icon: 'fa-sack-dollar',
      desc: '重点找可包装成小工具、服务、模板、课程、数字产品的项目',
      profileName: '个人变现优先',
      enabledAreaIds: ['vibe_monetization', 'codex_friendly', 'fun_interesting'],
      weights: { vibeCodingLearning: 15, officeAutomation: 15, monetizationPotential: 30, codexFriendly: 15, beginnerFriendly: 10, localFirst: 10, activity: 3, license: 2 },
      blacklistAdd: [],
      whitelistAdd: ['saas', 'indie', 'freelancer', 'invoice', 'resume', 'template', 'generator', 'automation']
    },
    fun: {
      key: 'fun',
      name: '新鲜有趣优先',
      icon: 'fa-wand-magic-sparkles',
      desc: '重点找有趣、新颖、启发性的 GitHub 项目',
      profileName: '新鲜有趣优先',
      enabledAreaIds: ['fun_interesting', 'personal_efficiency', 'local_first'],
      weights: { vibeCodingLearning: 20, officeAutomation: 10, monetizationPotential: 15, codexFriendly: 15, beginnerFriendly: 15, localFirst: 15, activity: 5, license: 5 },
      blacklistAdd: [],
      whitelistAdd: ['fun', 'creative', 'visualization', 'dashboard', 'knowledge', 'ollama', 'rag', 'scraper']
    },
    codex: {
      key: 'codex',
      name: 'Codex 学习优先',
      icon: 'fa-graduation-cap',
      desc: '重点找适合小白只读、适合 Codex 拆解、结构清晰的项目',
      profileName: 'Codex 学习优先',
      enabledAreaIds: ['codex_friendly', 'beginner_friendly', 'personal_efficiency'],
      weights: { vibeCodingLearning: 25, officeAutomation: 10, monetizationPotential: 10, codexFriendly: 25, beginnerFriendly: 20, localFirst: 5, activity: 3, license: 2 },
      blacklistAdd: ['enterprise framework', 'distributed system', 'microservice'],
      whitelistAdd: ['starter', 'simple', 'streamlit', 'flask', 'cli', 'beginner', 'tutorial', 'example']
    },
    local: {
      key: 'local',
      name: '本地工具优先',
      icon: 'fa-desktop',
      desc: '重点找不依赖服务器、不依赖付费 API、本地可运行的小工具',
      profileName: '本地工具优先',
      enabledAreaIds: ['local_first', 'personal_efficiency', 'codex_friendly'],
      weights: { vibeCodingLearning: 15, officeAutomation: 15, monetizationPotential: 15, codexFriendly: 15, beginnerFriendly: 10, localFirst: 25, activity: 3, license: 2 },
      blacklistAdd: ['requires server', 'cloud only', 'paid api', 'requires gpu'],
      whitelistAdd: ['local', 'offline', 'desktop', 'standalone', 'no backend', 'static']
    },
    web: {
      key: 'web',
      name: 'Web / PWA 优先',
      icon: 'fa-globe',
      desc: '重点找移动端 Web App、PWA、静态网站、个人工具、浏览器可用工具',
      profileName: 'Web / PWA 优先',
      enabledAreaIds: ['pwa_webapp', 'fun_interesting', 'personal_efficiency'],
      weights: { vibeCodingLearning: 20, officeAutomation: 10, monetizationPotential: 20, codexFriendly: 15, beginnerFriendly: 15, localFirst: 10, activity: 5, license: 5 },
      blacklistAdd: ['requires login', 'paid hosting', 'native only'],
      whitelistAdd: ['pwa', 'web app', 'static', 'browser', 'service worker', 'offline']
    },
    default: {
      key: 'default',
      name: '默认综合模式',
      icon: 'fa-gauge-high',
      desc: '综合覆盖办公自动化、变现、Codex 改造、新鲜有趣和学习效率',
      profileName: '默认综合模式',
      enabledAreaIds: ['office_automation', 'vibe_monetization', 'codex_friendly', 'fun_interesting', 'personal_efficiency'],
      weights: { vibeCodingLearning: 20, officeAutomation: 20, monetizationPotential: 15, codexFriendly: 15, beginnerFriendly: 10, localFirst: 10, activity: 5, license: 5 },
      blacklistAdd: [],
      whitelistAdd: []
    }
  },

  /**
   * 获取模板列表
   */
  getList() {
    return Object.values(this.templates);
  },

  /**
   * 应用模板到配置对象
   * @param {string} templateKey 模板 key
   * @param {object} baseConfig 基础配置（包含所有 focus areas）
   * @returns {object} 新的配置对象
   */
  applyTemplate(templateKey, baseConfig) {
    const template = this.templates[templateKey];
    if (!template) return baseConfig;

    // 深拷贝基础配置
    const newConfig = JSON.parse(JSON.stringify(baseConfig));

    // 设置画像名称
    newConfig.profileName = template.profileName;
    newConfig.updatedAt = new Date().toISOString().slice(0, 10);

    // 启用/禁用 focus areas
    newConfig.enabledFocusAreas.forEach(area => {
      area.enabled = template.enabledAreaIds.includes(area.id);
    });

    // 设置评分权重
    newConfig.scoringWeights = Object.assign({}, template.weights);

    // 追加黑白名单关键词（去重）
    const baseBlacklist = ['crypto', 'nft', 'trading bot', 'adult', 'casino', 'gambling', 'malware'];
    newConfig.blacklistKeywords = [...new Set([...baseBlacklist, ...template.blacklistAdd])];
    newConfig.whitelistKeywords = [...new Set([...(newConfig.whitelistKeywords || []), ...template.whitelistAdd])];

    return newConfig;
  },

  /**
   * 根据当前 profileName 匹配模板 key
   */
  matchTemplateByProfileName(profileName) {
    for (const t of Object.values(this.templates)) {
      if (t.profileName === profileName) return t.key;
    }
    return 'custom';
  }
};
