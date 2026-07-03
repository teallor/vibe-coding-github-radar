/* ===== main.js - 应用主入口 =====
 * 负责应用初始化、页面切换、全局工具方法
 */
const App = {
  currentPage: 'dashboard',
  codexPrompt: '', // 今日 Codex 提示词缓存

  /**
   * 应用初始化
   */
  async init() {
    try {
      await Api.loadAll();
      this.codexPrompt = Api.latestData ? (Api.latestData.codexPrompt || '') : '';
      this.renderDashboard();
      this.hideLoading();
      this.bindEvents();
      // 注册 Service Worker (PWA)
      this.registerSW();
    } catch (e) {
      console.error('初始化失败:', e);
      this.hideLoading();
      document.getElementById('app-main').innerHTML = `
        <div class="empty-state" style="padding:80px 20px;">
          <i class="fas fa-triangle-exclamation" style="font-size:48px;color:var(--danger)"></i>
          <p style="font-size:16px;margin-top:12px">数据加载失败</p>
          <p style="font-size:13px;color:var(--text-dim);margin-top:8px">
            请确保 data/latest.json 和 data/history.json 存在。<br>
            如果是首次使用，请运行 GitHub Actions 生成数据。<br>
            错误：${e.message}
          </p>
        </div>`;
    }
  },

  /**
   * 渲染首页
   */
  renderDashboard() {
    Render.renderDashboard(Api.latestData, Api.configData);
  },

  /**
   * 隐藏加载动画
   */
  hideLoading() {
    const loading = document.getElementById('loading-screen');
    if (loading) {
      loading.style.opacity = '0';
      setTimeout(() => loading.style.display = 'none', 300);
    }
  },

  /**
   * 绑定全局事件
   */
  bindEvents() {
    // 移动端菜单切换
    const toggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('main-nav');
    if (toggle) {
      toggle.addEventListener('click', () => nav.classList.toggle('open'));
    }
    // 点击导航链接后关闭移动菜单
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) nav.classList.remove('open');
      });
    });
  },

  /**
   * 页面切换
   */
  showPage(pageName) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    // 显示目标页面
    const target = document.getElementById('page-' + pageName);
    if (target) {
      target.style.display = 'block';
      this.currentPage = pageName;
      // 更新导航高亮
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageName);
      });
      // 按页面渲染内容
      this.renderPage(pageName);
      // 滚动到顶部
      window.scrollTo(0, 0);
    }
  },

  /**
   * 按页面名渲染内容
   */
  renderPage(pageName) {
    switch (pageName) {
      case 'dashboard':
        Render.renderDashboard(Api.latestData, Api.configData);
        break;
      case 'today':
        Render.renderTodayProjects(Api.latestData);
        break;
      case 'deepread':
        Render.renderDeepRead(Api.latestData);
        break;
      case 'library':
        Filters.init();
        break;
      case 'reports':
        Render.renderReportsList();
        break;
      case 'settings':
        Settings.initPage();
        break;
    }
  },

  /* ===== 全局工具方法 ===== */

  /**
   * 复制文本到剪贴板
   */
  async copyText(text) {
    if (!text) {
      this.toast('暂无内容可复制');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      this.toast('已复制到剪贴板');
    } catch (e) {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        this.toast('已复制到剪贴板');
      } catch (e2) {
        this.toast('复制失败，请手动选择文本复制');
      }
      document.body.removeChild(textarea);
    }
  },

  /**
   * 复制今日 Codex 提示词
   */
  copyCodexPrompt() {
    if (!this.codexPrompt) {
      this.toast('暂无 Codex 提示词');
      return;
    }
    this.copyText(this.codexPrompt);
  },

  /**
   * Toast 提示
   */
  toast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  },

  /**
   * 注册 Service Worker（PWA 支持）
   */
  registerSW() {
    if ('serviceWorker' in navigator) {
      // 只在生产环境注册，避免本地开发干扰
      // 使用 inline service worker via Blob
      const swCode = `
        const CACHE = 'vibe-radar-v1';
        self.addEventListener('install', e => self.skipWaiting());
        self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
        self.addEventListener('fetch', e => {
          // 网络优先，失败后用缓存
          e.respondWith(
            fetch(e.request).then(res => {
              if (e.request.method === 'GET' && res.ok) {
                const clone = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, clone));
              }
              return res;
            }).catch(() => caches.match(e.request))
          );
        });
      `;
      try {
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        navigator.serviceWorker.register(swUrl).catch(() => {
          // Blob SW 在某些环境不可用，静默失败
        });
      } catch (e) {
        // 静默失败
      }
    }
  }
};

/* ===== Reports 模块（报告归档页交互）===== */
const Reports = {
  currentReportText: '',
  currentReportDate: '',

  /**
   * 查看报告
   */
  async viewReport(date, path) {
    if (!path) {
      path = 'reports/' + date + '_VibeCoding_GitHub学习日报.md';
    }
    this.currentReportDate = date;
    const card = document.getElementById('report-viewer-card');
    const content = document.getElementById('report-viewer-content');
    const title = document.getElementById('report-viewer-title');

    card.style.display = 'block';
    title.textContent = date + ' 学习日报';
    content.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>正在加载报告...</p></div>';

    try {
      const text = await Api.fetchText(path);
      this.currentReportText = text;
      // 用 marked 解析 Markdown
      if (typeof marked !== 'undefined') {
        content.innerHTML = marked.parse(text);
      } else {
        content.innerHTML = '<pre>' + this.escapeHtml(text) + '</pre>';
      }
      // 滚动到查看器
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      content.innerHTML = `<div class="empty-state">
        <i class="fas fa-file-circle-xmark"></i>
        <p>报告文件未找到</p>
        <p style="font-size:12px;color:var(--text-dim)">文件路径：${path}</p>
        <p style="font-size:12px;color:var(--text-dim)">可能该日期的 GitHub Actions 尚未运行，或文件已被删除。</p>
      </div>`;
    }
  },

  /**
   * 复制当前报告
   */
  async copyCurrent() {
    if (!this.currentReportText) {
      App.toast('请先选择一份报告');
      return;
    }
    await App.copyText(this.currentReportText);
  },

  /**
   * 下载当前报告
   */
  downloadCurrent() {
    if (!this.currentReportText) {
      App.toast('请先选择一份报告');
      return;
    }
    const filename = this.currentReportDate + '_VibeCoding_GitHub学习日报.md';
    const blob = new Blob([this.currentReportText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    App.toast('已下载 ' + filename);
  },

  /**
   * 复制当日 Codex 提示词
   */
  async copyCodexPrompt() {
    // 尝试从 latest.json 获取对应日期的 codex prompt
    // 如果是今天的报告，直接用缓存
    const today = Api.latestData && Api.latestData.date;
    if (this.currentReportDate === today && Api.latestData.codexPrompt) {
      await App.copyText(Api.latestData.codexPrompt);
      return;
    }
    // 否则从报告 Markdown 中提取 Codex 提示词部分
    if (this.currentReportText) {
      const match = this.currentReportText.match(/## 八、今日 Codex 只读分析提示词\n\n([\s\S]*?)(?=\n## |$)/);
      if (match) {
        await App.copyText(match[1].trim());
        return;
      }
    }
    App.toast('未找到当日 Codex 提示词');
  },

  /**
   * 刷新报告列表
   */
  refresh() {
    // 重新加载 history
    Api.fetchJson('data/history.json').then(data => {
      Api.historyData = data;
      Render.renderReportsList();
      App.toast('报告列表已刷新');
    }).catch(() => {
      App.toast('刷新失败');
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

/* ===== 启动应用 ===== */
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
