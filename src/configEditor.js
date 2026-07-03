/* ===== configEditor.js - 配置编辑器模块 =====
 * 负责需求设置页的配置编辑、导出功能
 */
const ConfigEditor = {
  currentConfig: null,   // 当前编辑中的配置（深拷贝）
  isDirty: false,

  /**
   * 初始化设置页
   */
  init() {
    this.currentConfig = JSON.parse(JSON.stringify(Api.configData || Api.defaultConfigData));
    this.isDirty = false;
    this.renderAll();
  },

  markDirty() {
    this.isDirty = true;
  },

  /**
   * 渲染全部
   */
  renderAll() {
    this.renderTemplates();
    this.renderOverview();
    this.renderProfileName();
    this.renderFocusAreas();
    this.renderScoringWeights();
    this.renderBlacklistWhitelist();
    this.renderPrioritySettings();
    this.updateExportPreview();
  },

  /* ===== 模板 ===== */
  renderTemplates() {
    const container = document.getElementById('settings-templates');
    const currentKey = ProfileTemplates.matchTemplateByProfileName(this.currentConfig.profileName);
    const templates = ProfileTemplates.getList();
    container.innerHTML = templates.map(t => `
      <button class="template-btn ${currentKey === t.key ? 'active' : ''}"
              onclick="ConfigEditor.applyTemplateByKey('${t.key}')">
        <i class="fas ${t.icon}"></i>
        <div class="tname">${t.name}</div>
        <div class="tdesc">${t.desc}</div>
      </button>
    `).join('') + `
      <button class="template-btn ${currentKey === 'custom' ? 'active' : ''}"
              onclick="App.toast('当前为自定义模式，请在下方手动编辑配置')">
        <i class="fas fa-pen-ruler"></i>
        <div class="tname">自定义模式</div>
        <div class="tdesc">允许自己编辑全部配置</div>
      </button>`;
  },

  applyTemplateByKey(key) {
    if (key === 'custom') {
      App.toast('已切换为自定义模式，请在下方手动编辑');
      return;
    }
    // 从默认配置开始应用模板
    const baseConfig = Api.defaultConfigData || this.currentConfig;
    this.currentConfig = ProfileTemplates.applyTemplate(key, baseConfig);
    this.isDirty = true;
    this.renderAll();
    App.toast('已切换为「' + ProfileTemplates.templates[key].name + '」模板');
  },

  /* ===== 概览 ===== */
  renderOverview() {
    const config = this.currentConfig;
    const enabledAreas = Api.getEnabledFocusAreas(config);
    const keywordCount = Api.getKeywordCount(config);
    const weightTotal = Object.values(config.scoringWeights || {}).reduce((s, v) => s + v, 0);

    document.getElementById('settings-overview').innerHTML = `
      <div class="overview-item"><span class="olabel">当前需求画像</span><span class="ovalue">${this.escapeHtml(config.profileName || '-')}</span></div>
      <div class="overview-item"><span class="olabel">启用关注方向</span><span class="ovalue">${enabledAreas.length} 个</span></div>
      <div class="overview-item"><span class="olabel">关键词总数</span><span class="ovalue">${keywordCount} 个</span></div>
      <div class="overview-item"><span class="olabel">评分权重总分</span><span class="ovalue">${weightTotal} 分</span></div>
      <div class="overview-item"><span class="olabel">黑名单关键词</span><span class="ovalue">${(config.blacklistKeywords || []).length} 个</span></div>
      <div class="overview-item"><span class="olabel">白名单关键词</span><span class="ovalue">${(config.whitelistKeywords || []).length} 个</span></div>
      <div class="overview-item"><span class="olabel">屏蔽项目数</span><span class="ovalue">${(config.blockedRepos || []).length} 个</span></div>
      <div class="overview-item"><span class="olabel">下次 Actions 使用</span><span class="ovalue" style="font-size:13px">config/focus.json</span></div>`;
  },

  /* ===== 画像名称 ===== */
  renderProfileName() {
    const input = document.getElementById('settings-profile-name');
    if (input) input.value = this.currentConfig.profileName || '';
  },

  /* ===== 关注方向 ===== */
  renderFocusAreas() {
    const container = document.getElementById('settings-focus-areas');
    const areas = this.currentConfig.enabledFocusAreas || [];
    container.innerHTML = areas.map((area, idx) => `
      <div class="focus-area-editor" data-idx="${idx}">
        <div class="fa-header">
          <div class="fa-title">
            <label class="fa-toggle">
              <input type="checkbox" ${area.enabled ? 'checked' : ''} onchange="ConfigEditor.toggleArea(${idx}, this.checked)">
              <span class="slider"></span>
            </label>
            <input type="text" class="fa-name-input" value="${this.escapeAttr(area.name || '')}"
                   placeholder="方向名称" onchange="ConfigEditor.updateArea(${idx}, 'name', this.value)">
          </div>
          <button class="btn btn-sm btn-danger" onclick="ConfigEditor.removeFocusArea(${idx})">
            <i class="fas fa-trash"></i> 删除
          </button>
        </div>
        <div class="fa-grid">
          <div class="fa-field">
            <label>方向说明</label>
            <input type="text" value="${this.escapeAttr(area.description || '')}" placeholder="方向说明"
                   onchange="ConfigEditor.updateArea(${idx}, 'description', this.value)">
          </div>
          <div class="fa-field">
            <label>方向 ID</label>
            <input type="text" value="${this.escapeAttr(area.id || '')}" placeholder="如 office_automation"
                   onchange="ConfigEditor.updateArea(${idx}, 'id', this.value)">
          </div>
          <div class="fa-field">
            <label>推荐权重</label>
            <input type="number" value="${area.weight || 0}" min="0" max="100"
                   onchange="ConfigEditor.updateArea(${idx}, 'weight', parseInt(this.value)||0)">
          </div>
          <div class="fa-field">
            <label>最低 Star</label>
            <input type="number" value="${area.minStars || 0}" min="0"
                   onchange="ConfigEditor.updateArea(${idx}, 'minStars', parseInt(this.value)||0)">
          </div>
          <div class="fa-field">
            <label>更新时间范围（月）</label>
            <input type="number" value="${area.updatedWithinMonths || 18}" min="1" max="120"
                   onchange="ConfigEditor.updateArea(${idx}, 'updatedWithinMonths', parseInt(this.value)||18)">
          </div>
        </div>
        <div class="fa-keywords">
          <label>关键词列表（每行一个）</label>
          <textarea class="textarea-input" rows="5" placeholder="每行一个关键词"
                    onchange="ConfigEditor.updateAreaKeywords(${idx}, this.value)">${this.escapeHtml((area.keywords || []).join('\n'))}</textarea>
        </div>
        <div class="fa-keywords">
          <label>排除关键词（每行一个）</label>
          <textarea class="textarea-input" rows="3" placeholder="每行一个排除关键词"
                    onchange="ConfigEditor.updateAreaExcludeKeywords(${idx}, this.value)">${this.escapeHtml((area.excludeKeywords || []).join('\n'))}</textarea>
        </div>
      </div>
    `).join('');
  },

  toggleArea(idx, enabled) {
    this.currentConfig.enabledFocusAreas[idx].enabled = enabled;
    this.markDirty();
    this.renderOverview();
  },

  updateArea(idx, field, value) {
    this.currentConfig.enabledFocusAreas[idx][field] = value;
    this.markDirty();
    this.renderOverview();
  },

  updateAreaKeywords(idx, text) {
    const keywords = text.split('\n').map(s => s.trim()).filter(s => s);
    this.currentConfig.enabledFocusAreas[idx].keywords = keywords;
    this.markDirty();
    this.renderOverview();
  },

  updateAreaExcludeKeywords(idx, text) {
    const keywords = text.split('\n').map(s => s.trim()).filter(s => s);
    this.currentConfig.enabledFocusAreas[idx].excludeKeywords = keywords;
    this.markDirty();
  },

  addFocusArea() {
    const newArea = {
      id: 'custom_' + Date.now(),
      name: '新关注方向',
      description: '请编辑方向说明',
      enabled: true,
      weight: 10,
      keywords: [],
      excludeKeywords: [],
      minStars: 10,
      updatedWithinMonths: 18
    };
    this.currentConfig.enabledFocusAreas.push(newArea);
    this.markDirty();
    this.renderFocusAreas();
    this.renderOverview();
    App.toast('已新增关注方向');
  },

  removeFocusArea(idx) {
    if (!confirm('确定删除此关注方向？')) return;
    this.currentConfig.enabledFocusAreas.splice(idx, 1);
    this.markDirty();
    this.renderFocusAreas();
    this.renderOverview();
    App.toast('已删除关注方向');
  },

  /* ===== 评分权重 ===== */
  renderScoringWeights() {
    const container = document.getElementById('settings-scoring-weights');
    const weights = this.currentConfig.scoringWeights || {};
    const labels = {
      vibeCodingLearning: 'Vibe Coding 学习价值',
      officeAutomation: 'Office / 办公自动化价值',
      monetizationPotential: '个人变现潜力',
      codexFriendly: 'Codex 改造友好度',
      beginnerFriendly: '小白只读学习友好度',
      localFirst: '本地运行 / 免费优先程度',
      activity: '开源活跃度',
      license: 'License 清晰度'
    };

    let html = '';
    Object.entries(weights).forEach(([key, val]) => {
      html += `<div class="scoring-edit-item">
        <span class="scoring-edit-label">${labels[key] || key}</span>
        <input type="number" class="scoring-edit-input" value="${val}" min="0" max="100"
               onchange="ConfigEditor.updateWeight('${key}', this.value)">
      </div>`;
    });

    // 添加新权重的按钮
    html += `<div style="padding:14px 20px;">
      <button class="btn btn-sm btn-secondary" onclick="ConfigEditor.addWeight()">
        <i class="fas fa-plus"></i> 新增评分维度
      </button>
    </div>`;

    container.innerHTML = html;
    this.updateWeightTotal();
  },

  updateWeight(key, value) {
    this.currentConfig.scoringWeights[key] = parseInt(value) || 0;
    this.markDirty();
    this.updateWeightTotal();
    this.renderOverview();
  },

  addWeight() {
    const key = prompt('请输入新评分维度的英文 key（如 freshFun）：');
    if (!key) return;
    if (this.currentConfig.scoringWeights.hasOwnProperty(key)) {
      App.toast('该维度已存在');
      return;
    }
    const label = prompt('请输入维度中文名称（如 新鲜有趣程度）：');
    this.currentConfig.scoringWeights[key] = 10;
    this.markDirty();
    this.renderScoringWeights();
    this.renderOverview();
    App.toast('已新增评分维度：' + (label || key));
  },

  updateWeightTotal() {
    const total = Object.values(this.currentConfig.scoringWeights || {}).reduce((s, v) => s + v, 0);
    const el = document.getElementById('settings-weight-total');
    if (el) {
      el.textContent = '总分：' + total;
      el.style.color = total === 100 ? 'var(--warning)' : 'var(--danger)';
    }
  },

  /* ===== 黑白名单 ===== */
  renderBlacklistWhitelist() {
    document.getElementById('settings-blacklist').value = (this.currentConfig.blacklistKeywords || []).join('\n');
    document.getElementById('settings-whitelist').value = (this.currentConfig.whitelistKeywords || []).join('\n');
    document.getElementById('settings-blocked-repos').value = (this.currentConfig.blockedRepos || []).join('\n');
  },

  /* ===== 优先设置 ===== */
  renderPrioritySettings() {
    document.getElementById('settings-priority-owners').value = (this.currentConfig.priorityOwners || []).join('\n');
    document.getElementById('settings-priority-topics').value = (this.currentConfig.priorityTopics || []).join('\n');
    document.getElementById('settings-priority-languages').value = (this.currentConfig.priorityLanguages || []).join('\n');
  },

  /* ===== 导出配置 ===== */
  /**
   * 从表单收集当前配置
   */
  collectConfig() {
    const config = this.currentConfig;
    // 画像名称
    const nameInput = document.getElementById('settings-profile-name');
    if (nameInput) config.profileName = nameInput.value.trim() || '自定义模式';
    // 更新时间
    config.updatedAt = new Date().toISOString().slice(0, 10);
    if (!config.author) config.author = 'Rafael_Huang';

    // 黑白名单
    config.blacklistKeywords = this.textareaToArray('settings-blacklist');
    config.whitelistKeywords = this.textareaToArray('settings-whitelist');
    config.blockedRepos = this.textareaToArray('settings-blocked-repos');
    config.priorityOwners = this.textareaToArray('settings-priority-owners');
    config.priorityTopics = this.textareaToArray('settings-priority-topics');
    config.priorityLanguages = this.textareaToArray('settings-priority-languages');

    return config;
  },

  textareaToArray(id) {
    const el = document.getElementById(id);
    if (!el) return [];
    return el.value.split('\n').map(s => s.trim()).filter(s => s);
  },

  /**
   * 生成配置 JSON 字符串
   */
  generateConfigJson() {
    const config = this.collectConfig();
    return JSON.stringify(config, null, 2);
  },

  /**
   * 下载 config/focus.json
   */
  downloadConfig() {
    const json = this.generateConfigJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'focus.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    App.toast('已下载 config/focus.json');
  },

  /**
   * 复制 config/focus.json
   */
  async copyConfig() {
    const json = this.generateConfigJson();
    await App.copyText(json);
    App.toast('已复制 config/focus.json 到剪贴板');
  },

  /**
   * 生成给 Codex 的配置更新提示词
   */
  generateCodexUpdatePrompt() {
    return `请把我刚刚导出的 config/focus.json 写入当前 GitHub 仓库的 config/focus.json。不要改其他文件。完成后提交，提交信息为 update focus config。

以下是完整的 config/focus.json 内容：

${this.generateConfigJson()}

要求：
1. 只更新 config/focus.json 这一个文件
2. 不要修改其他任何文件
3. 完成后提交，commit message 为 "update focus config"
4. 不要运行任何脚本
5. 不要 clone 其他仓库
6. 不要访问私密数据`;
  },

  async copyCodexUpdatePrompt() {
    const prompt = this.generateCodexUpdatePrompt();
    await App.copyText(prompt);
    App.toast('已复制 Codex 配置更新提示词到剪贴板');
  },

  /**
   * 生成 GitHub 提交说明
   */
  generateCommitMessage() {
    const config = this.collectConfig();
    return `update focus config

需求画像: ${config.profileName}
更新时间: ${config.updatedAt}
启用方向: ${Api.getEnabledFocusAreas(config).map(a => a.name).join(', ')}

Original Author: Rafael_Huang`;
  },

  async copyCommitMessage() {
    const msg = this.generateCommitMessage();
    await App.copyText(msg);
    App.toast('已复制 GitHub 提交说明到剪贴板');
  },

  /**
   * 更新导出预览
   */
  updateExportPreview() {
    const preview = document.getElementById('settings-export-preview');
    if (!preview) return;
    // 只显示预览，不每次都重新生成完整 JSON（避免太频繁）
    const config = this.currentConfig;
    const enabledAreas = Api.getEnabledFocusAreas(config);
    preview.textContent = `// 预览：当前配置摘要
// 点击「下载」或「复制」获取完整 JSON
{
  "profileName": "${config.profileName}",
  "updatedAt": "${config.updatedAt}",
  "enabledFocusAreas": [ ${enabledAreas.length} 个方向 ],
  "scoringWeights": { 总分: ${Object.values(config.scoringWeights || {}).reduce((s, v) => s + v, 0)} },
  "blacklistKeywords": [ ${(config.blacklistKeywords || []).length} 个 ],
  "whitelistKeywords": [ ${(config.whitelistKeywords || []).length} 个 ],
  ...
}`;
  },

  /* ===== 工具方法 ===== */
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};
