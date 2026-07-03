/* ===== render.js - 渲染模块 =====
 * 负责各页面的内容渲染
 */
const Render = {

  /* ===== 首页 Dashboard ===== */
  renderDashboard(latest, config) {
    if (!latest) {
      document.getElementById('dashboard-update-time').textContent = '暂无数据';
      return;
    }

    document.getElementById('dashboard-update-time').textContent = '数据更新：' + (latest.updatedAt || latest.date || '-');

    // 需求画像名称
    const profileName = latest.activeProfile || (config ? config.profileName : '默认综合模式');
    document.getElementById('dashboard-profile-name').textContent = profileName;

    // 配置信息
    const enabledAreas = Api.getEnabledFocusAreas(config);
    const keywordCount = Api.getKeywordCount(config);
    document.getElementById('dashboard-focus-count').textContent = enabledAreas.length;
    document.getElementById('dashboard-keyword-count').textContent = keywordCount;
    document.getElementById('dashboard-config-time').textContent = config ? (config.updatedAt || '-') : '-';
    document.getElementById('dashboard-config-source').textContent = latest.configSource || 'config/focus.json';

    // 关注方向标签
    const focusContainer = document.getElementById('dashboard-focus-areas');
    if (enabledAreas.length > 0) {
      focusContainer.innerHTML = enabledAreas.map(area => `
        <div class="focus-tag">
          <i class="fas fa-compass"></i>
          <span>${this.escapeHtml(area.name)}</span>
          <span class="tag-weight">权重 ${area.weight}</span>
        </div>`).join('');
    } else {
      focusContainer.innerHTML = '<div class="empty-state"><p>暂无启用的关注方向</p></div>';
    }

    // 评分权重
    const weights = latest.scoringWeights || (config ? config.scoringWeights : {});
    const weightLabels = {
      vibeCodingLearning: 'Vibe Coding 学习价值',
      officeAutomation: 'Office / 办公自动化',
      monetizationPotential: '个人变现潜力',
      codexFriendly: 'Codex 改造友好度',
      beginnerFriendly: '小白只读学习友好度',
      localFirst: '本地运行 / 免费优先',
      activity: '开源活跃度',
      license: 'License 清晰度'
    };
    const weightsContainer = document.getElementById('dashboard-scoring-weights');
    const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0) || 100;
    weightsContainer.innerHTML = Object.entries(weights).map(([key, val]) => {
      const pct = (val / totalWeight * 100).toFixed(1);
      return `<div class="scoring-bar-item">
        <span class="scoring-bar-label">${weightLabels[key] || key}</span>
        <div class="scoring-bar-track"><div class="scoring-bar-fill" style="width:${pct}%"></div></div>
        <span class="scoring-bar-value">${val}</span>
      </div>`;
    }).join('');

    // Top Pick
    const topPick = latest.topPick;
    document.getElementById('dashboard-topscore').textContent = (topPick ? topPick.recommendScore : 0) + ' 分';
    const topContainer = document.getElementById('dashboard-toppick-content');
    if (topPick) {
      topContainer.innerHTML = `
        <div class="toppick-body">
          <div class="toppick-name"><a href="${topPick.url}" target="_blank" rel="noopener">${this.escapeHtml(topPick.name)}</a></div>
          <div class="toppick-desc">${this.escapeHtml(topPick.description || '')}</div>
          <div class="toppick-meta">
            <div class="meta-item"><span class="meta-label">作者</span><span class="meta-value">${this.escapeHtml(topPick.author || '-')}</span></div>
            <div class="meta-item"><span class="meta-label">语言</span><span class="meta-value">${this.escapeHtml(topPick.language || '-')}</span></div>
            <div class="meta-item"><span class="meta-label">Star</span><span class="meta-value">${this.formatNum(topPick.stars)}</span></div>
            <div class="meta-item"><span class="meta-label">License</span><span class="meta-value">${this.escapeHtml(topPick.license || '未知')}</span></div>
          </div>
          <div class="toppick-values">
            <div class="value-item"><div class="vlabel">Vibe Coding 学习价值</div><div class="vtext">${this.escapeHtml(topPick.vibeCodingValue || '-')}</div></div>
            <div class="value-item"><div class="vlabel">Office / 办公自动化</div><div class="vtext">${this.escapeHtml(topPick.officeAutomationValue || '-')}</div></div>
            <div class="value-item"><div class="vlabel">个人变现潜力</div><div class="vtext">${this.escapeHtml(topPick.monetizationPotential || '-')}</div></div>
            <div class="value-item"><div class="vlabel">Codex 改造友好度</div><div class="vtext">${this.escapeHtml(topPick.codexFriendly || '-')}</div></div>
            <div class="risk-item"><div class="vlabel">主要风险点</div><div class="vtext">${this.escapeHtml(topPick.riskPoints || '-')}</div></div>
          </div>
        </div>`;
    } else {
      topContainer.innerHTML = '<div class="empty-state"><p>暂无今日推荐</p></div>';
    }

    // 今日结论
    document.getElementById('dashboard-summary').textContent = latest.summary || '暂无今日结论';

    // 今日方向
    const directions = latest.tomorrowDirections || [];
    const dirIcons = ['fa-file-word', 'fa-sack-dollar', 'fa-wand-magic-sparkles', 'fa-graduation-cap', 'fa-desktop'];
    const dirContainer = document.getElementById('dashboard-directions');
    const todayDirLabels = ['办公自动化', '变现工具', '新鲜有趣', 'Codex 可改造', '学习技术'];
    // 渲染今日方向标签
    dirContainer.innerHTML = todayDirLabels.map((label, i) => `
      <div class="direction-item"><i class="fas ${dirIcons[i]}"></i>${label}</div>
    `).join('');

    // 最近7天
    this.renderHistory();
  },

  /**
   * 渲染历史记录
   */
  renderHistory() {
    const container = document.getElementById('dashboard-history');
    const history = Api.historyData && Api.historyData.history ? Api.historyData.history : [];
    const recent = history.slice(-7).reverse();

    if (recent.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-clock-rotate-left"></i><p>暂无历史记录。运行 GitHub Actions 后将在此显示。</p></div>';
      return;
    }

    container.innerHTML = '<div class="history-list">' + recent.map(item => {
      const topName = item.topPick ? item.topPick.name : '-';
      const topScore = item.topPick ? item.topPick.recommendScore : 0;
      return `<div class="history-item" onclick="Reports.viewReport('${item.date}')">
        <div>
          <div class="history-date">${item.date}</div>
          <div class="history-top">精读项目：${this.escapeHtml(topName)}</div>
        </div>
        <div class="history-score">${topScore} 分</div>
      </div>`;
    }).join('') + '</div>';
  },

  /* ===== 今日项目页 ===== */
  renderTodayProjects(latest) {
    const container = document.getElementById('today-projects-container');
    document.getElementById('today-update-time').textContent = '数据更新：' + (latest ? (latest.updatedAt || latest.date) : '-');

    if (!latest || !latest.selectedProjects || latest.selectedProjects.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><p>暂无今日精选项目。请运行 GitHub Actions 生成数据。</p></div>';
      return;
    }

    // 也展示 topPick
    const allProjects = [];
    if (latest.topPick) allProjects.push({ ...latest.topPick, _isTop: true });
    latest.selectedProjects.forEach(p => allProjects.push(p));

    container.innerHTML = allProjects.map(p => this.renderProjectCard(p)).join('');
  },

  renderProjectCard(p) {
    const scores = p.scores || {};
    const scoreItems = [
      { label: 'Vibe Coding 学习价值', key: 'vibeCodingLearning' },
      { label: 'Office / 办公自动化', key: 'officeAutomation' },
      { label: '个人变现潜力', key: 'monetizationPotential' },
      { label: 'Codex 改造友好度', key: 'codexFriendly' },
      { label: '小白只读学习友好度', key: 'beginnerFriendly' },
      { label: '本地运行 / 免费优先', key: 'localFirst' },
      { label: '开源活跃度', key: 'activity' },
      { label: 'License 清晰度', key: 'license' }
    ];
    const totalWeight = Object.values(scores).reduce((s, v) => s + (v || 0), 0) || 100;

    let scoresHtml = '<div style="margin-bottom:16px;">';
    scoreItems.forEach(item => {
      const val = scores[item.key] || 0;
      const pct = (val / totalWeight * 100).toFixed(1);
      scoresHtml += `<div class="scoring-bar-item">
        <span class="scoring-bar-label">${item.label}</span>
        <div class="scoring-bar-track"><div class="scoring-bar-fill" style="width:${pct}%"></div></div>
        <span class="scoring-bar-value">${val}</span>
      </div>`;
    });
    scoresHtml += '</div>';

    return `<div class="project-card">
      <div class="project-card-header">
        <div class="pname">
          ${p._isTop ? '<span class="badge badge-score" style="margin-right:8px">精读</span>' : ''}
          <a href="${p.url}" target="_blank" rel="noopener">${this.escapeHtml(p.name)}</a>
        </div>
        <span class="badge badge-score">${p.recommendScore || 0} 分</span>
      </div>
      <div class="project-card-body">
        <div class="project-desc">${this.escapeHtml(p.description || '')}</div>
        <div class="project-meta-grid">
          <div class="meta-item"><span class="meta-label">作者 / 组织</span><span class="meta-value">${this.escapeHtml(p.author || '-')}</span></div>
          <div class="meta-item"><span class="meta-label">主要语言</span><span class="meta-value">${this.escapeHtml(p.language || '-')}</span></div>
          <div class="meta-item"><span class="meta-label">Star</span><span class="meta-value">${this.formatNum(p.stars)}</span></div>
          <div class="meta-item"><span class="meta-label">Fork</span><span class="meta-value">${this.formatNum(p.forks)}</span></div>
          <div class="meta-item"><span class="meta-label">License</span><span class="meta-value">${this.escapeHtml(p.license || '未知')}</span></div>
          <div class="meta-item"><span class="meta-label">最近更新</span><span class="meta-value">${this.escapeHtml(p.updatedAt || '-')}</span></div>
          <div class="meta-item"><span class="meta-label">是否归档</span><span class="meta-value">${p.archived ? '<span style="color:var(--danger)">是</span>' : '否'}</span></div>
          <div class="meta-item"><span class="meta-label">Open Issues</span><span class="meta-value">${p.openIssues || 0}</span></div>
        </div>
        ${scoresHtml}
        <div class="toppick-values">
          <div class="value-item"><div class="vlabel">Vibe Coding 学习价值</div><div class="vtext">${this.escapeHtml(p.vibeCodingValue || '-')}</div></div>
          <div class="value-item"><div class="vlabel">Office / 办公自动化价值</div><div class="vtext">${this.escapeHtml(p.officeAutomationValue || '-')}</div></div>
          <div class="value-item"><div class="vlabel">个人变现潜力</div><div class="vtext">${this.escapeHtml(p.monetizationPotential || '-')}</div></div>
          <div class="value-item"><div class="vlabel">Codex 改造友好度</div><div class="vtext">${this.escapeHtml(p.codexFriendly || '-')}</div></div>
          <div class="risk-item"><div class="vlabel">主要风险点</div><div class="vtext">${this.escapeHtml(p.riskPoints || '-')}</div></div>
        </div>
      </div>
    </div>`;
  },

  /* ===== 今日精读页 ===== */
  renderDeepRead(latest) {
    const container = document.getElementById('deepread-container');
    if (!latest || !latest.topPick) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-book-open-reader"></i><p>暂无今日精读项目。请运行 GitHub Actions 生成数据。</p></div>';
      return;
    }

    const p = latest.topPick;
    const date = latest.date || new Date().toISOString().slice(0, 10);

    // 缓存提示词和模板到全局，供复制按钮使用
    App._cachedCodexPrompt = latest.codexPrompt || '';
    App._cachedMarkdownTemplate = latest.markdownTemplate || '';

    // 生成精读内容
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-trophy"></i> 今日精读项目：${this.escapeHtml(p.name)}</h3>
          <span class="badge badge-score">${p.recommendScore || 0} 分</span>
        </div>
        <div class="deepread-section">
          <h4><i class="fas fa-1"></i> 项目一句话解释</h4>
          <p>${this.escapeHtml(p.description || '暂无描述')}</p>
          <p style="margin-top:8px;color:var(--text-muted)">用小白能懂的话：${this.escapeHtml(this.generateSimpleExplanation(p))}</p>
        </div>
        <div class="deepread-section">
          <h4><i class="fas fa-2"></i> 为什么值得我今天读</h4>
          <ul>
            <li><strong>Vibe Coding 学习价值：</strong>${this.escapeHtml(p.vibeCodingValue || '-')}</li>
            <li><strong>Office / 办公自动化价值：</strong>${this.escapeHtml(p.officeAutomationValue || '-')}</li>
            <li><strong>个人变现潜力：</strong>${this.escapeHtml(p.monetizationPotential || '-')}</li>
            <li><strong>Codex 改造可能性：</strong>${this.escapeHtml(p.codexFriendly || '-')}</li>
            <li><strong>是否新鲜有趣：</strong>${this.escapeHtml(this.judgeFun(p))}</li>
          </ul>
        </div>
        <div class="deepread-section">
          <h4><i class="fas fa-3"></i> 今天只读哪些文件</h4>
          <p>不要安装，不要运行，不要改代码。只安排 30—45 分钟只读学习。</p>
          <p style="margin-top:8px"><strong>建议优先读：</strong></p>
          <ul>
            <li><code>README.md</code> — 项目说明，最重要的入口</li>
            <li><code>docs/</code> — 文档目录</li>
            <li><code>examples/</code> — 使用示例</li>
            <li><code>app.py</code> / <code>main.py</code> — 入口文件</li>
            <li><code>src/</code> — 核心源码</li>
            <li><code>requirements.txt</code> / <code>package.json</code> / <code>pyproject.toml</code> — 依赖配置</li>
            <li><code>templates/</code> — 模板文件</li>
            <li><code>tests/</code> — 测试代码（可学习用法）</li>
          </ul>
          <p style="margin-top:8px;color:var(--warning)"><i class="fas fa-triangle-exclamation"></i> 未查看到完整文件树，以下基于 README 和仓库元数据推断。</p>
        </div>
        <div class="deepread-section">
          <h4><i class="fas fa-4"></i> 小白名词解释</h4>
          ${this.renderTermExplanations()}
        </div>
        <div class="deepread-section">
          <h4><i class="fas fa-5"></i> 仓库结构拆解</h4>
          <ul>
            <li><strong>入口文件：</strong>可能在 <code>app.py</code>、<code>main.py</code> 或 <code>index.js</code></li>
            <li><strong>核心功能：</strong>可能在 <code>src/</code> 目录</li>
            <li><strong>配置文件：</strong>可能在根目录 <code>.env</code>、<code>config.yaml</code> 或 <code>config/</code></li>
            <li><strong>示例：</strong>可能在 <code>examples/</code> 或 <code>demos/</code></li>
            <li><strong>文档：</strong>可能在 <code>docs/</code> 或 <code>README.md</code></li>
            <li><strong>模板：</strong>可能在 <code>templates/</code></li>
            <li><strong>测试：</strong>可能在 <code>tests/</code> 或 <code>test/</code></li>
            <li><strong>暂时忽略：</strong>大型框架底层代码、CI 配置、复杂的构建脚本</li>
          </ul>
        </div>
        <div class="deepread-section">
          <h4><i class="fas fa-6"></i> 可迁移经验</h4>
          <ul>${this.renderTransferableExperience(p)}</ul>
        </div>
        <div class="deepread-section">
          <h4><i class="fas fa-7"></i> 个人变现判断</h4>
          ${this.renderMonetizationJudgment(p)}
        </div>
        <div class="deepread-section">
          <h4><i class="fas fa-8"></i> 今日 Codex 只读分析提示词</h4>
          <div class="prompt-block">
            <button class="copy-btn-float" onclick="App.copyText(App._cachedCodexPrompt)"><i class="fas fa-copy"></i> 复制</button>
${this.escapeHtml(latest.codexPrompt || '暂无提示词')}
          </div>
        </div>
        <div class="deepread-section">
          <h4><i class="fas fa-9"></i> 今日沉淀 Markdown 模板</h4>
          <div class="prompt-block">
            <button class="copy-btn-float" onclick="App.copyText(App._cachedMarkdownTemplate)"><i class="fas fa-copy"></i> 复制</button>
${this.escapeHtml(latest.markdownTemplate || '暂无模板')}
          </div>
        </div>
      </div>`;
  },

  /**
   * 生成小白能懂的简单解释
   */
  generateSimpleExplanation(p) {
    const desc = (p.description || '').toLowerCase();
    if (desc.includes('word') || desc.includes('docx')) return '这个项目能帮你用代码自动生成或修改 Word 文档。';
    if (desc.includes('excel') || desc.includes('xlsx')) return '这个项目能帮你用代码自动操作 Excel 表格。';
    if (desc.includes('pdf')) return '这个项目能帮你用代码生成或处理 PDF 文件。';
    if (desc.includes('ppt') || desc.includes('powerpoint')) return '这个项目能帮你用代码自动生成 PPT 演示文稿。';
    if (desc.includes('dashboard') || desc.includes('visualization')) return '这个项目能帮你把数据变成好看的图表或仪表盘。';
    if (desc.includes('scraper')) return '这个项目能帮你从网页上自动抓取数据。';
    if (desc.includes('automation')) return '这个项目能帮你把重复性的工作自动化。';
    if (desc.includes('note') || desc.includes('knowledge')) return '这个项目是一个笔记或知识管理工具。';
    if (desc.includes('cli')) return '这个项目是一个命令行工具，可以在终端里使用。';
    if (desc.includes('app') || desc.includes('tool')) return '这个项目是一个小工具或应用，可能有多种用途。';
    return '这是一个开源项目，你可以阅读它的代码来学习怎么实现类似功能。';
  },

  judgeFun(p) {
    const text = ((p.description || '') + ' ' + (p.name || '')).toLowerCase();
    const funWords = ['fun', 'creative', 'visualization', 'dashboard', 'habit', 'bookmark', 'interesting'];
    return funWords.some(w => text.includes(w)) ? '是，有启发性和趣味性' : '一般，但仍有学习价值';
  },

  renderTermExplanations() {
    const terms = [
      { name: 'GitHub', what: '一个存放代码的网站，全世界的人把项目放在上面共享', why: '可以找到大量免费开源项目学习和使用', when: '想找开源项目、托管自己的代码时', how: '在上面搜索关键词，找到项目后阅读 README' },
      { name: '仓库 (Repository)', what: 'GitHub 上一个项目的完整文件夹', why: '是项目代码的存放地', when: '访问项目时', how: '看仓库名和 README 判断是否值得读' },
      { name: 'README', what: '项目的说明书，告诉你这个项目是什么、怎么用', why: '是了解项目的第一步', when: '打开任何项目时先读', how: '看 README 能不能让你快速理解项目' },
      { name: 'License', what: '开源许可证，规定你能怎么使用这个项目的代码', why: '避免侵权，知道能不能商用', when: '想用别人代码时', how: 'MIT 最宽松，GPL 有传染性，无 License 需谨慎' },
      { name: 'Star', what: 'GitHub 上的点赞，代表有多少人觉得这个项目好', why: '衡量项目受欢迎程度', when: '判断项目质量时参考', how: 'Star 高说明受欢迎，但不一定适合你' },
      { name: 'Fork', what: '把别人的项目复制一份到自己账号下', why: '可以在自己的副本上修改', when: '想基于别人项目改造时', how: 'Fork 后可以在自己仓库自由修改' },
      { name: 'Issue', what: '项目的问题追踪，报告 bug 或提建议的地方', why: '了解项目已知问题和活跃度', when: '评估项目健康度时', how: 'Open Issues 多不一定差，看是否有人在回复' },
      { name: 'Pull Request', what: '提交代码修改的请求，请求项目作者合并你的改动', why: '参与开源贡献的方式', when: '你修改了代码想贡献回去时', how: '提交 PR 后等待作者审核' },
      { name: 'Commit', what: '一次代码提交，记录代码的变更', why: '追踪每次改了什么', when: '查看项目历史时', how: '看 commit 历史了解项目演进' },
      { name: 'API', what: '应用程序接口，程序之间对话的约定', why: '让不同程序能互相调用功能', when: '想用别人的功能时', how: '看 API 文档了解怎么调用' },
      { name: 'REST API', what: '一种常见的 API 设计风格，用 HTTP 请求操作数据', why: '简单通用，前后端都能用', when: '做 Web 应用时', how: '用 GET/POST/PUT/DELETE 操作资源' },
      { name: 'Token', what: '一串密码一样的字符串，用来证明你有权访问', why: '安全地访问需要认证的 API', when: '调用需要登录的 API 时', how: '绝对不能把 Token 放到前端代码里' },
      { name: 'CLI', what: '命令行界面，在终端里用文字命令操作', why: '高效，适合自动化', when: '做脚本和自动化时', how: '在终端输入命令运行' },
      { name: '依赖 (Dependency)', what: '项目运行需要的外部库或包', why: '不用自己写所有功能', when: '安装项目时', how: '看 requirements.txt 或 package.json' },
      { name: 'Python 包', what: 'Python 的扩展模块，提供额外功能', why: '避免重复造轮子', when: '需要某个功能时', how: '用 pip install 安装' },
      { name: '配置文件', what: '存放项目设置参数的文件', why: '不用改代码就能调整行为', when: '修改项目设置时', how: '看 .env、config.yaml、settings.json 等' },
      { name: '数据库', what: '有组织地存储数据的系统', why: '高效存储和查询大量数据', when: '需要持久化数据时', how: 'SQL 或 NoSQL，小项目可用 SQLite' },
      { name: 'Markdown', what: '一种简单的排版语法，用纯文本写带格式的文档', why: '简单易学，适合写文档', when: '写 README、笔记、报告时', how: '用 # 标题、**加粗**、- 列表等语法' },
      { name: 'HTML', what: '网页的骨架语言，定义网页的内容结构', why: '所有网页的基础', when: '做网页时', how: '用标签如 <p>、<div> 定义内容' },
      { name: '本地运行', what: '在你自己的电脑上运行，不需要联网服务器', why: '免费、隐私、不依赖网络', when: '个人工具优先本地运行', how: '用 python 或 node 命令直接运行' },
      { name: '自动任务', what: '按计划自动执行的任务，不需要人手动触发', why: '节省重复劳动', when: '需要定期执行的任务', how: '用 GitHub Actions cron 或系统定时任务' }
    ];
    return terms.map(t => `<div class="term-card">
      <div class="term-name">${t.name}</div>
      <div class="term-line"><strong>是什么：</strong>${t.what}</div>
      <div class="term-line"><strong>为什么需要：</strong>${t.why}</div>
      <div class="term-line"><strong>什么时候用：</strong>${t.when}</div>
      <div class="term-line"><strong>怎么判断是否用对：</strong>${t.how}</div>
    </div>`).join('');
  },

  renderTransferableExperience(p) {
    const experiences = [
      '一键启动方式（如何让项目快速跑起来）',
      '上传文件的处理方式',
      '批量处理的实现模式',
      '模板填充的设计思路',
      '文档生成的代码结构',
      '表格处理的最佳实践',
      '本地网页界面的搭建方法',
      '命令行工具的参数设计',
      '配置文件的格式设计',
      '报告导出的实现方式',
      '错误提示的用户友好设计',
      'README 的写法',
      'Release 版本说明的写法',
      '项目目录的组织方式',
      '个人工具的包装方式',
      '副业产品的包装方式'
    ];
    // 根据项目类型筛选
    const desc = (p.description || '').toLowerCase();
    const relevant = experiences.filter(e => {
      if (desc.includes('word') || desc.includes('docx') || desc.includes('excel') || desc.includes('pdf')) {
        return e.includes('文档') || e.includes('模板') || e.includes('报告') || e.includes('表格') || e.includes('批量');
      }
      return true;
    });
    return relevant.slice(0, 8).map(e => `<li>${e}</li>`).join('');
  },

  renderMonetizationJudgment(p) {
    const monetization = (p.monetizationPotential || '').toLowerCase();
    const hasPotential = monetization.includes('高') || monetization.includes('中') || monetization.includes('变现');
    return `<ul>
      <li><strong>它能不能启发个人变现？</strong> ${hasPotential ? '有可能。' : '暂时不太适合直接变现，但可以学习技术。'}</li>
      <li><strong>可能做成什么：</strong>
        <ul>
          <li>工具 — 包装成独立小工具出售或免费引流</li>
          <li>服务 — 提供文档生成、数据处理等在线服务</li>
          <li>模板 — 制作模板包出售</li>
          <li>课程 — 录制教学课程或写教程</li>
          <li>教程 — 写公众号/博客文章引流</li>
          <li>插件 — 做成浏览器插件或 Office 插件</li>
          <li>内部自动化方案 — 帮企业做定制自动化</li>
        </ul>
      </li>
      <li><strong>风险是什么：</strong>开源项目可能被直接复制，需要加上自己的服务、体验或内容壁垒。</li>
      <li><strong>为什么暂时不建议变现：</strong>先用 30 分钟只读学习，理解机制后再判断。第一次读不要急着变现，先积累可迁移经验。</li>
    </ul>`;
  },

  /* ===== 报告归档页 ===== */
  renderReportsList() {
    const container = document.getElementById('reports-list');
    const reports = Api.getReportList();

    if (reports.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-file-lines"></i><p>暂无历史报告。运行 GitHub Actions 后将在 reports/ 目录生成日报。</p></div>';
      return;
    }

    container.innerHTML = reports.map(r => `
      <div class="report-item" onclick="Reports.viewReport('${r.date}','${r.path}')">
        <div class="report-item-info">
          <i class="fas fa-file-lines"></i>
          <div>
            <div class="report-item-name">${r.filename}</div>
            <div class="report-item-date">精读项目：${this.escapeHtml(r.topPick)} · 画像：${this.escapeHtml(r.profileName)}</div>
          </div>
        </div>
        <i class="fas fa-chevron-right" style="color:var(--text-dim)"></i>
      </div>
    `).join('');
  },

  /* ===== 工具方法 ===== */
  formatNum(n) {
    if (!n) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n');
  }
};
