/* ===== settings.js - 设置页面协调模块 =====
 * 协调需求设置页的初始化和数据同步
 */
const Settings = {
  initialized: false,

  /**
   * 进入设置页时调用
   */
  initPage() {
    if (!this.initialized) {
      ConfigEditor.init();
      this.initialized = true;
    }
  },

  /**
   * 重置设置页（数据更新后重新加载）
   */
  reset() {
    this.initialized = false;
  }
};
