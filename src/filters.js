/* ===== filters.js - 项目库筛选模块 =====
 * 负责项目库页面的搜索、筛选、排序功能
 */
const Filters = {
  allProjects: [],

  /**
   * 初始化项目库数据
   */
  init() {
    this.allProjects = Api.getAllHistoricalProjects();
    this.populateLanguageFilter();
    this.applyFilters();
  },

  /**
   * 填充语言筛选下拉框
   */
  populateLanguageFilter() {
    const select = document.getElementById('filter-language');
    if (!select) return;
    const languages = [...new Set(this.allProjects.map(p => p.language).filter(l => l && l !== '-'))].sort();
    // 保留第一个 option
    select.innerHTML = '<option value="">全部</option>';
    languages.forEach(lang => {
      const opt = document.createElement('option');
      opt.value = lang;
      opt.textContent = lang;
      select.appendChild(opt);
    });
  },

  /**
   * 应用筛选条件
   */
  applyFilters() {
    const search = (document.getElementById('filter-search')?.value || '').toLowerCase().trim();
    const category = document.getElementById('filter-category')?.value || '';
    const language = document.getElementById('filter-language')?.value || '';
    const sort = document.getElementById('filter-sort')?.value || 'score';
    const officeOnly = document.getElementById('filter-office')?.value || '';
    const monetizationOnly = document.getElementById('filter-monetization')?.value || '';
    const codexOnly = document.getElementById('filter-codex')?.value || '';
    const funOnly = document.getElementById('filter-fun')?.value || '';

    let filtered = this.allProjects.filter(p => {
      // 搜索
      if (search) {
        const haystack = (p.name + ' ' + p.description + ' ' + p.fullName).toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      // 语言
      if (language && p.language !== language) return false;
      // 分类筛选（基于项目标签/值判断）
      if (category === 'office' && !this.isOfficeAutomation(p)) return false;
      if (category === 'monetization' && !this.hasMonetization(p)) return false;
      if (category === 'codex' && !this.isCodexFriendly(p)) return false;
      if (category === 'fun' && !this.isFun(p)) return false;
      if (category === 'learning' && !this.isLearning(p)) return false;
      // 额外筛选
      if (officeOnly === 'yes' && !this.isOfficeAutomation(p)) return false;
      if (officeOnly === 'no' && this.isOfficeAutomation(p)) return false;
      if (monetizationOnly === 'yes' && !this.hasMonetization(p)) return false;
      if (monetizationOnly === 'no' && this.hasMonetization(p)) return false;
      if (codexOnly === 'yes' && !this.isCodexFriendly(p)) return false;
      if (codexOnly === 'no' && this.isCodexFriendly(p)) return false;
      if (funOnly === 'yes' && !this.isFun(p)) return false;
      if (funOnly === 'no' && this.isFun(p)) return false;
      return true;
    });

    // 排序
    filtered.sort((a, b) => {
      switch (sort) {
        case 'stars': return (b.stars || 0) - (a.stars || 0);
        case 'updated': return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
        case 'name': return (a.name || '').localeCompare(b.name || '');
        default: return (b.recommendScore || 0) - (a.recommendScore || 0);
      }
    });

    this.renderTable(filtered);
  },

  // ===== 分类判断辅助方法 =====
  isOfficeAutomation(p) {
    const text = ((p.officeAutomationValue || '') + ' ' + (p.description || '') + ' ' + (p.name || '')).toLowerCase();
    const keywords = ['office', 'excel', 'word', 'pptx', 'pdf', 'docx', 'xlsx', 'document', 'template', 'report'];
    return keywords.some(k => text.includes(k));
  },
  hasMonetization(p) {
    const text = ((p.monetizationPotential || '') + ' ' + (p.description || '')).toLowerCase();
    const keywords = ['变现', 'monetization', 'saas', 'freelancer', 'invoice', 'resume', 'product', 'service'];
    return keywords.some(k => text.includes(k));
  },
  isCodexFriendly(p) {
    const text = ((p.codexFriendly || '') + ' ' + (p.description || '')).toLowerCase();
    const keywords = ['codex', '改造', 'starter', 'simple', 'cli', 'flask', 'streamlit'];
    return keywords.some(k => text.includes(k));
  },
  isFun(p) {
    const text = ((p.description || '') + ' ' + (p.name || '')).toLowerCase();
    const keywords = ['fun', 'creative', 'visualization', 'dashboard', 'habit', 'bookmark', 'knowledge'];
    return keywords.some(k => text.includes(k));
  },
  isLearning(p) {
    const text = ((p.vibeCodingValue || '') + ' ' + (p.description || '')).toLowerCase();
    const keywords = ['learning', '学习', 'tutorial', 'beginner', 'starter', 'example'];
    return keywords.some(k => text.includes(k));
  },

  /**
   * 重置所有筛选条件
   */
  resetFilters() {
    ['filter-search', 'filter-category', 'filter-language', 'filter-sort', 'filter-office', 'filter-monetization', 'filter-codex', 'filter-fun'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    if (document.getElementById('filter-sort')) document.getElementById('filter-sort').value = 'score';
    this.applyFilters();
  },

  /**
   * 渲染表格
   */
  renderTable(projects) {
    const container = document.getElementById('library-container');
    const countEl = document.getElementById('library-count');
    if (countEl) countEl.textContent = projects.length + ' 个项目';

    if (projects.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-magnifying-glass"></i>
          <p>没有找到匹配的项目，请调整筛选条件。</p>
        </div>`;
      return;
    }

    let html = '<div class="library-table-wrap"><table class="library-table"><thead><tr>';
    html += '<th>项目名</th><th>作者</th><th>语言</th><th>Star</th><th>License</th><th>推荐分</th><th>类型</th><th>日期</th>';
    html += '</tr></thead><tbody>';

    projects.forEach(p => {
      const sourceLabel = { topPick: '精读', selected: '精选', watch: '观察' }[p.source] || '-';
      const scoreColor = p.recommendScore >= 80 ? 'var(--primary)' : p.recommendScore >= 60 ? 'var(--secondary)' : 'var(--text-muted)';
      html += `<tr>
        <td><a href="${p.url}" target="_blank" rel="noopener">${this.escapeHtml(p.name)}</a></td>
        <td>${this.escapeHtml(p.author)}</td>
        <td><span class="lang-badge">${this.escapeHtml(p.language)}</span></td>
        <td>${this.formatNum(p.stars)}</td>
        <td>${this.escapeHtml(p.license)}</td>
        <td style="color:${scoreColor};font-weight:700">${p.recommendScore}</td>
        <td>${sourceLabel}</td>
        <td>${p.date}</td>
      </tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  },

  formatNum(n) {
    if (!n) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
