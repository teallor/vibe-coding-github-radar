# Vibe Coding GitHub Radar

> 一个可调整需求画像的 GitHub 机会雷达，用于个人 Vibe Coding 学习、办公自动化、个人变现和新鲜有趣项目发现。

**Original Author: Rafael_Huang**

---

## 📖 项目简介

这是一个**完全免费、无需后端服务器**的静态 Web App。它每天自动搜索 GitHub 上适合个人 Vibe Coding 学习、办公自动化复用、个人变现尝试的开源项目，并生成中文学习日报。

### 核心特点

- ✅ **完全免费** — 不需要付费 API、不需要服务器、不需要数据库
- ✅ **静态网站** — 纯 HTML/CSS/JS，部署到 GitHub Pages
- ✅ **自动更新** — GitHub Actions 每天定时运行
- ✅ **可调整需求画像** — 搜索关键词、评分权重、关注方向均可修改
- ✅ **安全只读** — 不自动 clone、不运行陌生代码、不访问私人仓库
- ✅ **移动友好** — 支持添加到手机主屏幕（PWA）
- ✅ **无需登录** — 不需要账户系统

---

## 🚀 快速部署到 GitHub Pages

### 第 1 步：新建 GitHub 仓库

1. 登录 [GitHub](https://github.com)
2. 点击右上角 **+** → **New repository**
3. 仓库名填 `vibe-coding-github-radar`（或任意名字）
4. 选择 **Public**（公开）
5. 勾选 **Add a README file**
6. 点击 **Create repository**

### 第 2 步：上传项目代码

#### 方式 A：通过浏览器上传

1. 将本项目所有文件下载到本地
2. 在 GitHub 仓库页面点击 **Add file** → **Upload files**
3. 拖拽所有文件上传（注意保持目录结构）
4. 点击 **Commit changes**

#### 方式 B：通过 Git 命令行

```bash
# 克隆空仓库
git clone https://github.com/你的用户名/vibe-coding-github-radar.git
cd vibe-coding-github-radar

# 将项目文件复制到仓库目录
# （把下载的文件覆盖到此目录）

# 提交并推送
git add .
git commit -m "Initial commit - Vibe Coding GitHub Radar"
git push origin main
```

### 第 3 步：开启 GitHub Pages

1. 进入仓库 → **Settings** → **Pages**
2. **Source** 选择 **Deploy from a branch**
3. **Branch** 选择 `main`，文件夹选择 `/ (root)`
4. 点击 **Save**
5. 等待 1-2 分钟，页面顶部会显示你的网站地址：
   `https://你的用户名.github.io/vibe-coding-github-radar/`

### 第 4 步：启用 GitHub Actions

1. 进入仓库 → **Settings** → **Actions** → **General**
2. **Actions permissions** 选择 **Allow all actions and reusable workflows**
3. **Workflow permissions** 选择 **Read and write permissions**（必须，否则无法自动提交）
4. 勾选 **Allow GitHub Actions to create and approve pull requests**
5. 点击 **Save**

### 第 5 步：手动运行一次

1. 进入仓库 → **Actions** 标签页
2. 左侧选择 **Daily GitHub Scout**
3. 点击 **Run workflow** → **Run workflow**
4. 等待运行完成（约 2-5 分钟）
5. 运行完成后，仓库中会自动出现：
   - `data/latest.json`（更新为真实数据）
   - `data/history.json`（新增今日记录）
   - `reports/YYYY-MM-DD_VibeCoding_GitHub学习日报.md`（今日日报）

### 第 6 步：访问网站

打开 `https://你的用户名.github.io/vibe-coding-github-radar/` 即可看到网站。

> 如果页面显示的还是示例数据，请等待 1-2 分钟让 GitHub Pages 重新部署，然后刷新页面（或加 `?v=2` 强制刷新）。

---

## 📱 添加到手机主屏幕

### iPhone (Safari)

1. 用 Safari 打开网站
2. 点击底部 **分享** 按钮（方框向上箭头）
3. 选择 **添加到主屏幕**
4. 点击 **添加**

### Android (Chrome)

1. 用 Chrome 打开网站
2. 点击右上角 **三个点** 菜单
3. 选择 **添加到主屏幕**
4. 点击 **添加**

---

## ⚙️ 如何修改需求画像

### 方式一：在网页中编辑（推荐）

1. 打开网站 → 进入 **需求设置** 页面
2. 编辑关注方向、关键词、评分权重、黑白名单等
3. 点击 **下载 config/focus.json** 或 **复制 config/focus.json**
4. 将文件内容交给 Codex 更新到仓库

### 方式二：直接编辑 config/focus.json

1. 在 GitHub 仓库中打开 `config/focus.json`
2. 点击编辑按钮（铅笔图标）
3. 修改内容后提交

### 方式三：用 Codex 更新配置

1. 在需求设置页点击 **复制给 Codex 的更新提示词**
2. 将提示词粘贴给 Codex
3. Codex 会自动更新 `config/focus.json` 并提交

---

## 🔧 如何修改关键词

### 在网页中

1. 进入 **需求设置** 页面
2. 找到对应关注方向的 **关键词列表** 文本框
3. 每行一个关键词，编辑后导出

### 在 config/focus.json 中

```json
{
  "enabledFocusAreas": [
    {
      "id": "office_automation",
      "keywords": [
        "office automation",
        "excel automation",
        "你新增的关键词"
      ]
    }
  ]
}
```

---

## ⚖️ 如何修改评分权重

### 在网页中

1. 进入 **需求设置** 页面
2. 找到 **评分权重管理** 部分
3. 直接修改各维度的数值
4. 建议总分保持在 100

### 在 config/focus.json 中

```json
{
  "scoringWeights": {
    "vibeCodingLearning": 20,
    "officeAutomation": 35,
    "monetizationPotential": 15,
    ...
  }
}
```

> 例如想把重点放在 Office 自动化，把 `officeAutomation` 调高到 35。

---

## 🔄 如何切换需求画像

1. 进入 **需求设置** 页面
2. 在 **需求画像模板** 部分选择一个模板：
   - **Office 自动化优先** — 重点找 Word/Excel/PPT/PDF 工具
   - **个人变现优先** — 重点找可包装成产品/服务的项目
   - **新鲜有趣优先** — 重点找有启发性的创意项目
   - **Codex 学习优先** — 重点找适合小白只读学习的项目
   - **本地工具优先** — 重点找不依赖服务器的工具
   - **Web / PWA 优先** — 重点找 Web App 和 PWA
   - **默认综合模式** — 综合覆盖所有方向
3. 点击模板按钮即可切换
4. 点击 **下载** 或 **复制** 导出配置
5. 交给 Codex 更新到仓库

---

## 📤 如何导出 config/focus.json

1. 进入 **需求设置** 页面
2. 在 **配置导出** 部分选择：
   - **下载 config/focus.json** — 直接下载文件
   - **复制 config/focus.json** — 复制到剪贴板
3. 将文件内容交给 Codex 或手动提交到仓库

---

## 🤖 如何把 config/focus.json 交给 Codex 更新

1. 在需求设置页点击 **复制给 Codex 的更新提示词**
2. 将提示词粘贴给 Codex
3. Codex 会执行以下操作：
   - 把配置写入 `config/focus.json`
   - 提交，commit message 为 `update focus config`
   - 不修改其他文件

---

## ⏰ 如何修改每日运行时间

编辑 `.github/workflows/daily-scout.yml` 中的 cron 表达式：

```yaml
on:
  schedule:
    # 当前：每天 UTC 1:17（北京时间 9:17）
    - cron: '17 1 * * *'
```

### 时区对照表

| 北京时间 | UTC |
|---------|-----|
| 6:00 | 22:00 (前一天) |
| 9:00 | 1:00 |
| 12:00 | 4:00 |
| 18:00 | 10:00 |

> 建议不要使用整点 0 分，避免 GitHub Actions 拥堵。

---

## 🤖 如何使用生成的 Codex 提示词

1. 打开网站 → **首页** → 点击 **复制 Codex 提示词**
   或进入 **今日精读** 页面查看完整提示词
2. 将提示词粘贴给 Codex（或 ChatGPT、Claude 等）
3. Codex 会只读分析项目，不运行、不安装、不改代码
4. 最后沉淀成 Markdown 学习笔记

---

## ❓ 常见问题 FAQ

### Q1: 网站显示的还是示例数据？

**A:** 请确认 GitHub Actions 已成功运行。进入仓库 **Actions** 标签页查看运行状态。运行成功后等待 1-2 分钟让 GitHub Pages 更新，然后刷新页面。

### Q2: GitHub Actions 运行失败怎么办？

**A:** 常见原因：
1. **权限不足** — 确认 Settings → Actions → Workflow permissions 设为 Read and write
2. **API 限流** — 匿名请求限额为 60 次/小时。GitHub Actions 默认提供 GITHUB_TOKEN，限额为 5000 次/小时。如果仍被限流，减少搜索任务数量（编辑 `scripts/keywords.js` 中的 `maxKeywordsPerArea`）
3. **Node 版本** — 确认使用 Node.js 18+（workflow 已配置 Node 20）

### Q3: 需要付费吗？

**A:** **完全免费**。GitHub Pages、GitHub Actions（公开仓库无限额度）、GitHub Search API 都是免费的。

### Q4: 需要配置 GitHub Token 吗？

**A:** **不需要额外配置**。GitHub Actions 自动提供 `GITHUB_TOKEN`（`secrets.GITHUB_TOKEN`），只需用于搜索公开仓库和提交文件。不要在网页前端输入或保存 Token。

### Q5: 可以搜索私人仓库吗？

**A:** **不可以**。本项目只搜索 GitHub 公开仓库，不访问私人仓库，不读取私密数据。

### Q6: 会自动 clone 项目吗？

**A:** **不会**。本项目只通过 GitHub API 获取仓库元数据（名称、描述、Star、License 等），不会 clone 任何项目，不会运行任何陌生代码。

### Q7: 如何查看 data/latest.json 是否生成？

**A:** 进入仓库 → `data/latest.json` → 查看文件内容。如果 `date` 字段是今天且 `summary` 不是示例文字，说明已成功生成。

### Q8: 如何查看 reports 是否生成？

**A:** 进入仓库 → `reports/` 目录 → 应该有 `YYYY-MM-DD_VibeCoding_GitHub学习日报.md` 文件。

### Q9: 哪些情况可能产生费用？如何避免？

**A:**
1. **GitHub Actions 超额** — 公开仓库免费无限额度，私有仓库每月 2000 分钟。保持仓库 **Public** 即可避免。
2. **GitHub Pages 超额** — 公开仓库免费，有 100GB/月 流量和 1GB/构建限制。本项目数据量很小，远不会超标。
3. **API 限流** — 免费 API 已足够。不要使用付费的 GitHub Enterprise API。

### Q10: 可以在本地运行搜索脚本吗？

**A:** 可以。确保安装了 Node.js 18+，然后运行：
```bash
node scripts/scout.js
```
这会在本地生成 `data/latest.json`、`data/history.json` 和 `reports/` 日报。注意匿名请求限额较低（60 次/小时）。

### Q11: 网站可以在本地打开吗？

**A:** 可以直接用浏览器打开 `index.html`。但由于 fetch 加载 JSON 文件需要 HTTP 协议，建议用本地服务器：
```bash
# Python 3
python -m http.server 8000
# 然后访问 http://localhost:8000

# 或 Node.js
npx serve
```

---

## 📁 项目目录结构

```
vibe-coding-github-radar/
├── README.md                          # 本文件
├── package.json                       # 项目元数据
├── index.html                         # 主页面
├── config/
│   ├── default-focus.json             # 默认配置（fallback）
│   └── focus.json                     # 当前生效配置（可导出更新）
├── src/
│   ├── main.js                        # 应用主入口
│   ├── styles.css                     # 样式表
│   ├── api.js                         # 数据加载模块
│   ├── render.js                      # 页面渲染模块
│   ├── filters.js                     # 项目库筛选模块
│   ├── settings.js                    # 设置页协调模块
│   ├── configEditor.js                # 配置编辑器
│   └── profileTemplates.js            # 需求画像模板
├── public/
│   ├── manifest.json                  # PWA 清单
│   └── icon.svg                       # 应用图标
├── scripts/
│   ├── scout.js                       # 搜索主脚本
│   ├── scoring.js                     # 评分系统
│   ├── report.js                      # 日报生成
│   ├── keywords.js                    # 关键词生成
│   └── loadConfig.js                  # 配置加载
├── data/
│   ├── latest.json                    # 今日数据
│   └── history.json                   # 历史数据
├── reports/
│   └── .gitkeep                       # 日报目录占位
└── .github/
    └── workflows/
        └── daily-scout.yml            # GitHub Actions 工作流
```

---

## 📄 配置文件说明 (config/focus.json)

| 字段 | 说明 |
|------|------|
| `profileName` | 需求画像名称 |
| `updatedAt` | 配置更新时间 |
| `author` | 作者 |
| `enabledFocusAreas` | 关注方向列表 |
| `scoringWeights` | 评分权重 |
| `blacklistKeywords` | 黑名单关键词 |
| `whitelistKeywords` | 白名单关键词 |
| `blockedRepos` | 屏蔽项目列表 |
| `priorityOwners` | 优先关注的 owner |
| `priorityTopics` | 优先关注的 topic |
| `priorityLanguages` | 优先关注的语言 |

### 关注方向字段说明

| 字段 | 说明 |
|------|------|
| `id` | 方向唯一标识 |
| `name` | 方向名称 |
| `description` | 方向说明 |
| `enabled` | 是否启用 |
| `weight` | 推荐权重 |
| `keywords` | 搜索关键词列表 |
| `excludeKeywords` | 排除关键词 |
| `minStars` | 最低 Star 数 |
| `updatedWithinMonths` | 更新时间范围（月） |

---

## 🛠️ 技术架构

### 前端

- 纯 HTML/CSS/JavaScript（无框架依赖）
- 通过 fetch 加载 JSON 数据
- 支持移动端响应式布局
- PWA 支持（可添加到主屏幕）
- 使用 marked.js 解析 Markdown（CDN）
- 使用 Font Awesome 图标（CDN）
- 使用 Google Fonts 字体（CDN）

### GitHub Actions

- GitHub 项目雷达与 Codex 中文播客雷达每天北京时间 09:00 在同一个 workflow 中运行
- 支持 workflow_dispatch 手动触发
- Node.js 20 环境
- 调用 GitHub Search API 搜索公开仓库
- 自动提交生成的数据文件
- 使用默认 GITHUB_TOKEN（无需额外配置）

### Codex 中文播客雷达

- 复用 `.github/workflows/daily-scout.yml`：先生成原 GitHub Radar，再筛选播客，最后合并为一张飞书卡片；不会删除或替换原日报内容
- 通过 Apple Podcasts 中国大陆、香港、台湾公开索引发现节目，再读取公开 RSS 的逐集简介/Shownotes 与时长
- 时长不足 20 分钟、时长未知、无正文证据、中文不足、链接不可访问或评分低于 75 的单集不会正式推荐
- 标题含 Codex 但没有可读正文的单集只列为“待人工确认”，不会进入正式推荐
- 播客筛选证据写入 Actions 运行产物 `codex-podcast-radar-<run id>`；GitHub Radar 仍照常更新仓库中的日报与历史数据
- 沿用 GitHub Secrets：`FEISHU_WEBHOOK`（机器人 Webhook）与 `FEISHU_SECRET`（机器人签名密钥），均不可写入代码

### 数据流

```
config/focus.json
       ↓
  GitHub Actions (每天)
       ↓
  GitHub Search API
       ↓
  评分系统计算
       ↓
  data/latest.json + data/history.json + reports/日报.md
       ↓
  GitHub Pages 自动部署
       ↓
  网页前端读取展示
```

---

## 🔒 安全说明

- ❌ 不自动 clone 项目
- ❌ 不运行陌生项目代码
- ❌ 不执行第三方仓库脚本
- ❌ 不上传私人文件
- ❌ 不需要私人 Token
- ❌ 不把 Token 放入前端
- ❌ 不访问私人仓库
- ✅ 所有项目只做只读分析
- ✅ 如果未查看真实文件树，报告中会明确说明基于元数据推断
- ✅ License 不明确会标注风险
- ✅ 长期停更会标注风险
- ✅ 依赖付费 API 会标注风险

---

## 🎯 验收清单

- [x] 本地打开或部署后能看到首页
- [x] 能读取 data/latest.json
- [x] 能展示当前需求画像
- [x] 能展示当前启用关注方向
- [x] 能展示当前评分权重
- [x] 能展示今日最值得精读项目
- [x] 能展示今日精选项目表
- [x] 能复制 Codex 提示词
- [x] 能查看历史报告
- [x] 能进入需求设置页
- [x] 能编辑关注方向
- [x] 能编辑关键词
- [x] 能编辑评分权重
- [x] 能导出 config/focus.json
- [x] 能生成给 Codex 的配置更新提示词
- [x] GitHub Actions 能手动触发
- [x] GitHub Actions 能每天自动运行
- [x] GitHub Actions 能读取 config/focus.json
- [x] GitHub Actions 能生成 latest.json
- [x] GitHub Actions 能生成 Markdown 日报
- [x] 不需要付费 API
- [x] 不需要服务器
- [x] 不需要 App Store
- [x] 不需要 Mac

---

## 🔄 下一轮调试提示词

如果你想让我帮你调试或增强这个项目，可以使用以下提示词：

```
请帮我调试 Vibe Coding GitHub Radar 项目。

项目仓库：[你的仓库地址]

当前问题/需求：
[描述你遇到的问题或想增加的功能]

请先阅读以下文件了解项目结构：
1. README.md
2. config/focus.json
3. scripts/scout.js
4. .github/workflows/daily-scout.yml

要求：
- 不要改变项目的静态网站定位
- 不要引入后端服务器
- 不要引入付费 API
- 不要把 Token 放到前端
- 保持 GitHub Pages 可部署
- 保持 GitHub Actions 可运行
```

---

## 📝 License

MIT License

**Original Author: Rafael_Huang**
