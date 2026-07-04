# Vibe Coding GitHub Radar

> 一个可调整需求画像的 GitHub 机会雷达，用于个人 Vibe Coding 学习、办公自动化、个人变现和新鲜有趣项目发现。

**Original Author: Rafael_Huang**

## 每日三合一雷达（当前版本）

项目每天只向飞书发送**一条消息**，其中包含：

1. **Vibe Coding / GitHub Radar**：最多 2 条，最低 85 分。
2. **Codex / AI Coding 播客雷达**：最多 2 条，最低 85 分且时长不少于 20 分钟。
3. **AI C端应用与 Codex 生态更新雷达**：最多 3 条，最低 85 分，优先 Codex、Skills、MCP、插件和 Agent 工具。

数量是上限，不是任务指标。没有达到门槛的内容会显示“已跳过，不硬凑”。第三类不是泛 AI 新闻；融资、股价、传闻、营销软文和没有原始链接的内容默认淘汰。

### Gemini 在项目中做什么

公开网页、GitHub API、Apple Podcasts、RSS 和官方更新页负责建立三类真实候选池；规则只负责来源、时长、License、活跃度、正文证据等不可妥协的硬门槛；Gemini 3.1 Pro 对三类内容都执行最终语义质量评审、结构化摘要和是否推荐判断。Gemini 不可用、超时或返回非法 JSON 时，程序会明确记录并按配置降级，不会令整个 workflow 失败。

- GitHub Radar：目标至少 300 个去重候选；硬过滤后为前列项目补读 README，再由 Gemini 3.1 Pro 终审。
- 播客 Radar：目标至少 100 个真实单集候选；必须有不少于 20 分钟的时长与可读 Shownotes/简介，再由 Gemini 3.1 Pro 终审。
- AI C端应用与 Codex 生态：从 GitHub 与官方更新源建立候选池，规则排除传闻、融资和营销内容，再由 Gemini 3.1 Pro 终审。

如果 GitHub 少于 300 个候选或播客少于 100 个候选，当天会明确显示“候选池未达标”，不会把不完整搜索伪装成“今日没有推荐”。

默认模型在 `config/runtime.json` 的 `radars.aiApp.geminiModel` 中配置。当前使用 Vertex AI 模型 ID `gemini-3.1-pro-preview`，以更强的推理能力执行严格质量评审；可随 Google 模型生命周期调整。

#### 确保使用 Google Cloud 赠金

程序按以下顺序调用：

1. **Vertex AI + Application Default Credentials（优先）**：费用进入 `GOOGLE_CLOUD_PROJECT` 对应的 Google Cloud 结算账户，适合使用 GCP 赠金。
2. **`GEMINI_API_KEY`（后备）**：仅当 Vertex 未配置时使用。它的实际扣费取决于该 Key 所属项目和 AI Studio / Cloud Billing 设置。
3. 两者都不可用：规则评分。

本地 Windows PowerShell：

```powershell
gcloud auth application-default login
$env:GOOGLE_CLOUD_PROJECT="你的项目 ID"
$env:GOOGLE_CLOUD_LOCATION="global"
npm run dry-run
```

如果只使用 Gemini API Key：

```powershell
$env:GEMINI_API_KEY="粘贴你自己的 Key"
npm run dry-run
```

关闭 PowerShell 窗口后临时环境变量即失效。不要把真实 Key 写入 `.env.example`、README、代码或提交记录。

### GitHub Secrets 与 Variables

进入仓库 `Settings → Secrets and variables → Actions`：

- Secrets：`FEISHU_WEBHOOK`、`FEISHU_SECRET`、`GEMINI_API_KEY`。
- 为保证 Actions 优先消耗 Vertex / GCP 赠金，可额外添加 `GCP_CREDENTIALS`，内容为仅具 Vertex AI 调用权限的服务账号 JSON。
- Variables：`GOOGLE_CLOUD_PROJECT`（GCP 项目 ID）、`GOOGLE_CLOUD_LOCATION`（建议 `global`）。

如果不配置 `GCP_CREDENTIALS`，Actions 会尝试 `GEMINI_API_KEY`；如果 Key 也不存在，则自动降级规则评分。

### 本地命令

```powershell
npm ci                 # 安装依赖
npm test               # 运行自动测试
npm run dry-run        # 获取三类候选、评分并生成文件，不发送飞书
npm run preview        # 输出最终三合一飞书卡片 JSON，不发送
npm run send-test      # 环境变量齐全时发送一条测试消息，否则安全跳过
npm run full-run       # 完整生成三类内容并只发送一条合并消息
```

`preview` 需要先执行一次 `dry-run`，确保三类 JSON 已生成。

### 调整数量、门槛和关键词

编辑 `config/runtime.json`：

- `radars.github.maxItems`、`radars.podcast.maxItems`、`radars.aiApp.maxItems`：每类最大条数。
- 每类的 `minScore`：质量门槛。
- `radars.aiApp.keywords`：第三类关键词及权重，可直接增删。
- `radars.aiApp.useGeminiReview`：是否启用 Gemini 二次评审。
- `radars.aiApp.geminiModel`：模型 ID。

### 如何检查运行结果

- Actions 成功：仓库 `Actions → Daily GitHub Scout` 中所有步骤为绿色。
- 飞书成功：日志出现 `sent successfully`，并且飞书只收到标题为“每日 AI / Codex / Vibe Coding 雷达”的一张卡片。
- GitHub 完整日报：每天飞书发送前会同步生成 `reports/YYYY-MM-DD_每日AI_Codex_VibeCoding雷达.md`；它与飞书使用同一份三类数据，并由 Actions 自动提交到仓库。
- 飞书卡片底部的“查看 GitHub 三合一完整日报”按钮可直接打开上述文件。Actions 尚未完成提交时，链接可能短暂等待数秒后才可访问。
- 候选不足：日志和飞书总评会显示候选数、达标数、来源失败和主要淘汰原因。
- 详细证据：Actions artifacts 中查看播客与第三类筛选 JSON。
- 本地日志：PowerShell 直接显示每类候选、达标、Gemini 成功次数和降级原因；不会打印 Key。

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

## ⏰ 每日 06:45 推送与延迟排查

编辑 `.github/workflows/daily-scout.yml` 中的 cron 表达式：

```yaml
on:
  schedule:
    # Target Feishu send time: Asia/Shanghai 06:45.
    # Start at 06:20 to generate first; UTC 22:20 = Asia/Shanghai next day 06:20.
    - cron: '20 22 * * *'
```

目标是飞书在北京时间 **06:45 左右发送成功**，不是 06:45 才开始生成。workflow 在 06:20 启动，先完成三类雷达；如果提前完成，就等待到 06:45 再发送。如果生成完成时已经超过 06:45，则立即发送，不再等待，并记录是 Actions 晚启动还是生成/平台耗时造成延迟。系统不会伪造时间，会同时记录 UTC、Asia/Shanghai、ISO 和中文时间。

如果推送晚了，打开仓库 **Actions → Daily GitHub Scout → 当天运行 → scout**，搜索 `[time]`。重点比较 `workflow scheduled time`、`workflow actual start time`、`workflow job start time`、内容生成开始/结束和飞书发送开始/成功：前两项差距大是 Actions 排队，内容生成区间长则是搜索、网络或 Gemini 耗时。

06:45–07:10 会记录真实延迟但视为可接受；如果 Actions 在 06:45 后才启动，飞书会直接显示对应原因。晚于 07:10，飞书卡片底部显示延迟警告；晚于 07:30，Markdown 日报增加“调度异常记录”。`workflow_dispatch` 手动运行默认立即发送且不误报每日定时异常；只有手动勾选 `wait_until_target` 才会等待到当日 06:45（若该时间已过则立即发送）。

### 时区对照表

| 北京时间 | UTC |
|---------|-----|
| 6:00 | 22:00 (前一天) |
| 6:20（workflow 启动） | 22:20（前一天） |
| 6:45 | 22:45（前一天） |
| 12:00 | 4:00 |
| 18:00 | 10:00 |

> 定时语法使用 UTC，是因为 workflow 文件采用 GitHub Actions 通用 cron 写法。

---

## 📝 反馈沉淀与重复内容

本项目明确区分两种反馈能力：

1. **当前基础能力（已实现）**：飞书展示反馈 ID；你把“反馈 ID + 已读不错/已读不行/重复了/允许继续追踪 + 原因”发给 Codex，由 Codex 调用 `scripts/record-feedback.js` 写入 `data/feedback.json`。
2. **飞书自动反馈（已提供可部署 Worker，需完成一次外部配置）**：`workers/feishu-feedback-worker.js` 可接收飞书应用机器人的 `im.message.receive_v1` 事件，解析自然语言反馈并通过 GitHub Contents API 写入 `data/feedback.json`。普通 custom bot webhook 仍只负责每日推送；接收消息必须使用飞书应用机器人。

启用步骤、最小权限与 Cloudflare Secret 配置见 [`docs/FEISHU_FEEDBACK_AUTOMATION.md`](docs/FEISHU_FEEDBACK_AUTOMATION.md)。该方案使用 Cloudflare Worker，不需要数据库、常驻服务器或付费 API。

每条飞书和 Markdown 内容都有稳定反馈 ID。GitHub 使用 `github:<owner>/<repo>`；播客和 AI 应用使用归一化链接的短哈希。录入示例：

```bash
node scripts/record-feedback.js --id "podcast:8f3a91c2" --feedback "已读不错" --note "Codex 实操很有价值"
node scripts/record-feedback.js --url "https://example.com/item" --feedback "已读不行" --note "标题党，内容太空"
node scripts/record-feedback.js --title "某播客标题" --feedback "重复了"
node scripts/record-feedback.js --id "github:owner/repo" --feedback "允许继续追踪"
```

标题匹配多个历史条目时，脚本只列候选，不会乱选。反馈分为：`positive`（已读不错）、`negative`（已读不行）、`duplicate`（重复了）、`allow_repeat`（允许继续追踪）和 `neutral`（意思不明确）。neutral 只保存；没有反馈时也不推断喜好。positive 只给相似新内容小幅加分，不会把低质量内容推过原门槛；negative 会让相似内容降权。

重复规则：

- 从未推过：正常筛选。
- 推过但无反馈：低优先级允许再次出现，并明确标注重复。
- positive：说明已经看过，同一条默认不再推。
- negative 或 duplicate：同一条禁止再推；negative 相似内容降权。
- allow_repeat：允许继续追踪，但标注“追踪更新”。
- 播客除链接外还比较节目名、单集标题、发布日期、时长和 shownotes；只是同一档不同集不会误杀，无法确认时标为“疑似重复”并降权。

手动自检：

```bash
npm test
npm run test:feedback
npm run test:schedule
npm run preview
npm run dry-run
```

`preview` 只根据现有数据生成飞书预览；`dry-run` 会联网生成三类雷达但不会发送飞书。

### 同一天防重复发送锁

真实发送记录保存在 `data/send-ledger.json`。当天只要已有一条 `status: "sent"`：后续 schedule 和手动运行都会跳过 webhook；确需再次真发时，必须在手动 Run workflow 时勾选 `force_send`。`preview` 与 `dry-run` 永远不会调用 webhook，也不会写成功发送记录。失败尝试可记录为 `failed`，但不会锁住当天，因此可以安全重试。

每条成功记录包含日期、目标时间、实际发送时间、触发类型、Actions run ID、卡片摘要哈希和是否强制发送。workflow 使用同一个 concurrency group 串行运行，并在成功后自动提交发送台账，避免同一天的排队任务同时穿透检查。

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

- 三类雷达每天北京时间 06:20 由同一个 workflow 定时触发，提前生成并在约 06:45 发送飞书
- 支持 workflow_dispatch 手动触发；默认立即发送，也可勾选 `wait_until_target`
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
