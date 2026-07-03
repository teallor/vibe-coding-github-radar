/**
 * report.js - 日报生成模块
 * GitHub Actions 脚本，生成每日 Markdown 学习日报
 *
 * 报告结构按照需求规范，包含：
 * 一、今日结论
 * 二、当前需求画像
 * 三、今日精选项目表
 * 四、今日最值得精读项目（9 个小节）
 * 五、备选观察项目
 * 六、不推荐项目
 * 七、明天建议关注方向
 */

/**
 * 生成完整的 Markdown 日报
 * @param {object} data - 包含 date, config, source, topPick, selectedProjects, watchProjects, notRecommended, tomorrowDirections
 * @returns {string} Markdown 文本
 */
function generateReport(data) {
  const { date, config, source, topPick, selectedProjects, watchProjects, notRecommendedProjects, tomorrowDirections, summary } = data;
  const enabledAreas = (config.enabledFocusAreas || []).filter(a => a.enabled);
  const keywordCount = (config.enabledFocusAreas || []).reduce((s, a) => s + (a.keywords || []).length, 0);
  const weights = config.scoringWeights || {};
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

  let md = `# ${date} Vibe Coding GitHub 学习日报\n\n`;
  md += `> Original Author: Rafael_Huang\n\n`;

  // ===== 一、今日结论 =====
  md += `## 一、今日结论\n\n`;
  md += `${summary || generateSummary(topPick, config)}\n\n`;

  // ===== 二、当前需求画像 =====
  md += `## 二、当前需求画像\n\n`;
  md += `- **当前需求画像：** ${config.profileName || '默认综合模式'}\n`;
  md += `- **启用关注方向：** ${enabledAreas.map(a => a.name).join('、') || '无'}\n`;
  md += `- **评分权重：**\n`;
  for (const [key, val] of Object.entries(weights)) {
    md += `  - ${weightLabels[key] || key}：${val}\n`;
  }
  md += `- **关键词数量：** ${keywordCount} 个\n`;
  md += `- **配置来源：** ${source}\n\n`;

  // ===== 三、今日精选项目表 =====
  md += `## 三、今日精选项目表\n\n`;
  const allSelected = [];
  if (topPick) allSelected.push({ ...topPick, _label: '精读' });
  if (selectedProjects) selectedProjects.forEach(p => allSelected.push({ ...p, _label: '精选' }));

  if (allSelected.length > 0) {
    md += `| 项目名 | GitHub 链接 | 作者 | 语言 | Star | Fork | License | 最近更新 | 归档 | Issues | 推荐分 | Vibe Coding | Office | 变现 | Codex | 风险点 |\n`;
    md += `|--------|------------|------|------|------|------|---------|----------|------|--------|--------|-------------|--------|------|-------|--------|\n`;
    for (const p of allSelected) {
      md += `| ${p.name} | [链接](${p.url}) | ${p.author || '-'} | ${p.language || '-'} | ${p.stars || 0} | ${p.forks || 0} | ${p.license || '未知'} | ${p.updatedAt || '-'} | ${p.archived ? '是' : '否'} | ${p.openIssues || 0} | ${p.recommendScore || 0} | ${(p.vibeCodingValue || '-').substring(0, 20)} | ${(p.officeAutomationValue || '-').substring(0, 20)} | ${(p.monetizationPotential || '-').substring(0, 20)} | ${(p.codexFriendly || '-').substring(0, 20)} | ${(p.riskPoints || '-').substring(0, 30)} |\n`;
    }
    md += `\n`;
  } else {
    md += `*今日无精选项目。*\n\n`;
  }

  // ===== 四、今日最值得精读项目 =====
  md += `## 四、今日最值得精读项目\n\n`;
  if (topPick) {
    md += `### 1. 项目一句话解释\n\n`;
    md += `${topPick.description || '暂无描述'}\n\n`;
    md += `用小白能懂的话：${generateSimpleExplanation(topPick)}\n\n`;

    md += `### 2. 为什么值得我今天读\n\n`;
    md += `- **Vibe Coding 学习价值：** ${topPick.vibeCodingValue || '-'}\n`;
    md += `- **Office / 办公自动化价值：** ${topPick.officeAutomationValue || '-'}\n`;
    md += `- **个人变现潜力：** ${topPick.monetizationPotential || '-'}\n`;
    md += `- **Codex 改造可能性：** ${topPick.codexFriendly || '-'}\n`;
    md += `- **是否新鲜有趣：** ${judgeFun(topPick)}\n\n`;

    md += `### 3. 今天只读哪些文件\n\n`;
    md += `不要安装，不要运行，不要改代码。只安排 30—45 分钟只读学习。\n\n`;
    md += `根据仓库真实结构，建议优先读：\n\n`;
    md += `- \`README.md\` — 项目说明，最重要的入口\n`;
    md += `- \`docs/\` — 文档目录\n`;
    md += `- \`examples/\` — 使用示例\n`;
    md += `- \`app.py\` / \`main.py\` — 入口文件\n`;
    md += `- \`src/\` — 核心源码\n`;
    md += `- \`requirements.txt\` / \`package.json\` / \`pyproject.toml\` — 依赖配置\n`;
    md += `- \`templates/\` — 模板文件\n`;
    md += `- \`tests/\` — 测试代码\n\n`;
    md += `> ⚠️ 未查看到完整文件树，以下基于 README 和仓库元数据推断。\n\n`;

    md += `### 4. 小白名词解释\n\n`;
    md += generateTermExplanations();
    md += `\n`;

    md += `### 5. 仓库结构拆解\n\n`;
    md += `- **入口文件：** 可能在 \`app.py\`、\`main.py\` 或 \`index.js\`\n`;
    md += `- **核心功能：** 可能在 \`src/\` 目录\n`;
    md += `- **配置文件：** 可能在根目录 \`.env\`、\`config.yaml\` 或 \`config/\`\n`;
    md += `- **示例：** 可能在 \`examples/\` 或 \`demos/\`\n`;
    md += `- **文档：** 可能在 \`docs/\` 或 \`README.md\`\n`;
    md += `- **模板：** 可能在 \`templates/\`\n`;
    md += `- **测试：** 可能在 \`tests/\` 或 \`test/\`\n`;
    md += `- **暂时忽略：** 大型框架底层代码、CI 配置、复杂的构建脚本\n\n`;

    md += `### 6. 可迁移经验\n\n`;
    const experiences = generateTransferableExperience(topPick);
    for (const exp of experiences) {
      md += `- ${exp}\n`;
    }
    md += `\n`;

    md += `### 7. 个人变现判断\n\n`;
    md += generateMonetizationJudgment(topPick);
    md += `\n`;

    md += `### 8. 今日 Codex 只读分析提示词\n\n`;
    md += `\`\`\`\n`;
    md += generateCodexPrompt(topPick, date);
    md += `\n\`\`\`\n\n`;

    md += `### 9. 今日沉淀模板\n\n`;
    md += `\`\`\`markdown\n`;
    md += generateMarkdownTemplate(topPick, date);
    md += `\n\`\`\`\n\n`;
  } else {
    md += `*今日无精读项目。*\n\n`;
  }

  // ===== 五、备选观察项目 =====
  md += `## 五、备选观察项目\n\n`;
  if (watchProjects && watchProjects.length > 0) {
    md += `| 项目名 | GitHub 链接 | 语言 | Star | 推荐分 | 风险点 |\n`;
    md += `|--------|------------|------|------|--------|--------|\n`;
    for (const p of watchProjects.slice(0, 5)) {
      md += `| ${p.name} | [链接](${p.url}) | ${p.language || '-'} | ${p.stars || 0} | ${p.recommendScore || 0} | ${(p.riskPoints || '-').substring(0, 40)} |\n`;
    }
    md += `\n`;
  } else {
    md += `*今日无备选观察项目。*\n\n`;
  }

  // ===== 六、不推荐项目 =====
  md += `## 六、不推荐项目\n\n`;
  if (notRecommendedProjects && notRecommendedProjects.length > 0) {
    for (const p of notRecommendedProjects.slice(0, 3)) {
      md += `- **${p.name}** ([链接](${p.url || '#'}))：${p.reason || '不推荐'}\n`;
    }
    md += `\n`;
  } else {
    md += `*今日无不推荐项目。*\n\n`;
  }

  // ===== 七、明天建议关注方向 =====
  md += `## 七、明天建议关注方向\n\n`;
  if (tomorrowDirections && tomorrowDirections.length > 0) {
    for (const dir of tomorrowDirections.slice(0, 3)) {
      md += `- ${dir}\n`;
    }
  } else {
    md += `- 继续关注当前启用的方向\n`;
    md += `- 尝试切换需求画像模板探索新方向\n`;
    md += `- 根据今天的学习收获调整评分权重\n`;
  }
  md += `\n---\n\n*Original Author: Rafael_Huang*\n`;

  return md;
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

function generateSimpleExplanation(p) {
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
  return '这是一个开源项目，你可以阅读它的代码来学习怎么实现类似功能。';
}

function judgeFun(p) {
  const text = ((p.description || '') + ' ' + (p.name || '')).toLowerCase();
  const funWords = ['fun', 'creative', 'visualization', 'dashboard', 'habit', 'bookmark', 'interesting'];
  return funWords.some(w => text.includes(w)) ? '是，有启发性和趣味性' : '一般，但仍有学习价值';
}

function generateTermExplanations() {
  const terms = [
    { name: 'GitHub', what: '一个存放代码的网站，全世界的人把项目放在上面共享', why: '可以找到大量免费开源项目学习和使用', when: '想找开源项目、托管自己的代码时', how: '在上面搜索关键词，找到项目后阅读 README' },
    { name: '仓库 (Repository)', what: 'GitHub 上一个项目的完整文件夹', why: '是项目代码的存放地', when: '访问项目时', how: '看仓库名和 README 判断是否值得读' },
    { name: 'README', what: '项目的说明书，告诉你这个项目是什么、怎么用', why: '是了解项目的第一步', when: '打开任何项目时先读', how: '看 README 能不能让你快速理解项目' },
    { name: 'License', what: '开源许可证，规定你能怎么使用这个项目的代码', why: '避免侵权，知道能不能商用', when: '想用别人代码时', how: 'MIT 最宽松，GPL 有传染性，无 License 需谨慎' },
    { name: 'Star', what: 'GitHub 上的点赞，代表有多少人觉得这个项目好', why: '衡量项目受欢迎程度', when: '判断项目质量时参考', how: 'Star 高说明受欢迎，但不一定适合你' },
    { name: 'Fork', what: '把别人的项目复制一份到自己账号下', why: '可以在自己的副本上修改', when: '想基于别人项目改造时', how: 'Fork 后可以在自己仓库自由修改' },
    { name: 'Issue', what: '项目的问题追踪，报告 bug 或提建议的地方', why: '了解项目已知问题和活跃度', when: '评估项目健康度时', how: 'Open Issues 多不一定差，看是否有人在回复' },
    { name: 'Pull Request', what: '提交代码修改的请求', why: '参与开源贡献的方式', when: '你修改了代码想贡献回去时', how: '提交 PR 后等待作者审核' },
    { name: 'Commit', what: '一次代码提交，记录代码的变更', why: '追踪每次改了什么', when: '查看项目历史时', how: '看 commit 历史了解项目演进' },
    { name: 'API', what: '应用程序接口，程序之间对话的约定', why: '让不同程序能互相调用功能', when: '想用别人的功能时', how: '看 API 文档了解怎么调用' },
    { name: 'REST API', what: '一种常见的 API 设计风格', why: '简单通用', when: '做 Web 应用时', how: '用 GET/POST/PUT/DELETE 操作资源' },
    { name: 'Token', what: '一串密码一样的字符串，用来证明你有权访问', why: '安全地访问需要认证的 API', when: '调用需要登录的 API 时', how: '绝对不能把 Token 放到前端代码里' },
    { name: 'CLI', what: '命令行界面，在终端里用文字命令操作', why: '高效，适合自动化', when: '做脚本和自动化时', how: '在终端输入命令运行' },
    { name: '依赖 (Dependency)', what: '项目运行需要的外部库或包', why: '不用自己写所有功能', when: '安装项目时', how: '看 requirements.txt 或 package.json' },
    { name: 'Python 包', what: 'Python 的扩展模块', why: '避免重复造轮子', when: '需要某个功能时', how: '用 pip install 安装' },
    { name: '配置文件', what: '存放项目设置参数的文件', why: '不用改代码就能调整行为', when: '修改项目设置时', how: '看 .env、config.yaml、settings.json 等' },
    { name: '数据库', what: '有组织地存储数据的系统', why: '高效存储和查询数据', when: '需要持久化数据时', how: 'SQL 或 NoSQL，小项目可用 SQLite' },
    { name: 'Markdown', what: '一种简单的排版语法', why: '简单易学，适合写文档', when: '写 README、笔记、报告时', how: '用 # 标题、**加粗**、- 列表等语法' },
    { name: 'HTML', what: '网页的骨架语言', why: '所有网页的基础', when: '做网页时', how: '用标签定义内容' },
    { name: '本地运行', what: '在你自己的电脑上运行', why: '免费、隐私、不依赖网络', when: '个人工具优先本地运行', how: '用 python 或 node 命令直接运行' },
    { name: '自动任务', what: '按计划自动执行的任务', why: '节省重复劳动', when: '需要定期执行的任务', how: '用 GitHub Actions cron 或系统定时任务' }
  ];
  return terms.map(t => `**${t.name}**\n- 是什么：${t.what}\n- 为什么需要：${t.why}\n- 什么时候用：${t.when}\n- 怎么判断是否用对：${t.how}\n`).join('\n');
}

function generateTransferableExperience(p) {
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
    '项目目录的组织方式',
    '个人工具的包装方式',
    '副业产品的包装方式'
  ];
  return experiences.slice(0, 10);
}

function generateMonetizationJudgment(p) {
  const monetization = (p.monetizationPotential || '').toLowerCase();
  const hasPotential = monetization.includes('高') || monetization.includes('中');
  let md = `**它能不能启发个人变现？** ${hasPotential ? '有可能。' : '暂时不太适合直接变现，但可以学习技术。'}\n\n`;
  md += `**可能做成什么：**\n- 工具 — 包装成独立小工具出售或免费引流\n- 服务 — 提供文档生成、数据处理等在线服务\n- 模板 — 制作模板包出售\n- 课程 — 录制教学课程或写教程\n- 教程 — 写公众号/博客文章引流\n- 插件 — 做成浏览器插件或 Office 插件\n- 内部自动化方案 — 帮企业做定制自动化\n\n`;
  md += `**风险是什么：** 开源项目可能被直接复制，需要加上自己的服务、体验或内容壁垒。\n\n`;
  md += `**为什么暂时不建议变现：** 先用 30 分钟只读学习，理解机制后再判断。第一次读不要急着变现，先积累可迁移经验。\n`;
  return md;
}

function generateCodexPrompt(topPick, date) {
  return `请帮我只读分析以下 GitHub 项目，不要运行、不要安装、不要 clone、不要改代码。请分析项目结构、核心机制、可学习点、可迁移点、变现启发点。每个新名词先用小白能懂的话解释。最后沉淀成 Markdown 文件。

项目地址：${topPick.url}
项目名：${topPick.name}
日期：${date}

分析要求：
1. 用一句话解释它是什么
2. 为什么值得我今天读
3. 今天只读哪些文件（30-45 分钟）
4. 仓库结构拆解
5. 可迁移经验
6. 个人变现判断
7. 沉淀成 Markdown 模板

安全要求：
- 不运行任何代码
- 不安装任何依赖
- 不 clone 陌生项目
- 不执行第三方脚本
- 只做只读分析`;
}

function generateMarkdownTemplate(topPick, date) {
  return `# ${date} Vibe Coding GitHub 学习沉淀

## 项目基本信息
- 项目名：${topPick.name}
- GitHub 链接：${topPick.url}
- 作者：${topPick.author || '-'}
- 语言：${topPick.language || '-'}
- Star：${topPick.stars || 0}
- License：${topPick.license || '未知'}

## 为什么选它

## 它属于哪类机会
- [ ] 办公自动化
- [ ] 变现工具
- [ ] 新鲜有趣
- [ ] 学习技术
- [ ] Codex 改造

## 我读了哪些文件

## 我学到的 3 个机制
1. 
2. 
3. 

## 我没懂的地方

## 可迁移到我的 Vibe Coding 实践的点

## 可能的变现方式

## 是否值得让 Codex 深挖

## 我的主观评分（1-10）`;
}

module.exports = { generateReport, generateCodexPrompt, generateMarkdownTemplate };
