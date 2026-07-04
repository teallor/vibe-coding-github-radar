# 飞书自然语言反馈自动入库（Cloudflare Worker）

这个可选组件把飞书应用机器人收到的文本事件写回 GitHub 的 `data/feedback.json`，不需要数据库、常驻服务器或付费 API。每日 custom webhook 推送保持不变；应用机器人只负责接收反馈事件。

## 数据流

`飞书群消息 → im.message.receive_v1 → Cloudflare Worker → GitHub Contents API → data/feedback.json`

Worker 只处理以 `反馈 ` 开头且符合以下格式的文本，其他群消息直接返回 `ignored`：

```text
反馈 podcast:1fa53f7c 已读不错，原因：Codex 实操有价值
反馈 podcast:1fa53f7c 已读不行，原因：标题党，内容太空
反馈 podcast:1fa53f7c 重复了，原因：之前推过
反馈 github:owner/repo 允许继续追踪，原因：后续更新值得看
```

## 1. 创建飞书应用机器人

1. 在飞书开放平台创建企业自建应用并开启“机器人”能力。
2. 把应用机器人加入接收每日雷达的群。
3. 添加事件 `接收消息`（`im.message.receive_v1`）。
4. 若希望群成员无需 @ 机器人即可直接发送反馈，需要申请“获取群组中所有消息”权限；若只使用较小权限，则发送反馈时需要 @ 机器人。只给应用开放必要的群和用户范围。
5. 在“事件订阅”中选择“将事件发送至开发者服务器”，稍后填 Worker HTTPS 地址。
6. 记录 Verification Token。当前最小版本使用 Verification Token 与 Worker 群/用户白名单；请不要在飞书后台开启 Encrypt Key（本版本不解密加密事件体）。

## 2. 创建 GitHub Token

创建 Fine-grained personal access token：

- Repository access：只选择 `teallor/vibe-coding-github-radar`。
- Repository permissions → Contents：Read and write。
- 不授予 Issues、Actions、Administration 等无关权限。

Worker 使用 GitHub Contents API，更新已有文件时携带当前 `sha`；遇到并发冲突会重新读取并最多重试三次。

## 3. 部署 Worker

安装 Wrangler CLI 后，在仓库根目录执行：

```bash
cp wrangler.toml.example wrangler.toml
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put FEISHU_VERIFICATION_TOKEN
npx wrangler deploy
```

Windows PowerShell 可用：

```powershell
Copy-Item wrangler.toml.example wrangler.toml
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put FEISHU_VERIFICATION_TOKEN
npx wrangler deploy
```

编辑本地 `wrangler.toml`：

- `GITHUB_REPO`：完整仓库名 `teallor/vibe-coding-github-radar`；`GITHUB_BRANCH`：`main`。
- `FEISHU_ALLOWED_CHAT_ID`：允许群 ID；强烈建议取得 ID 后填写。也支持逗号分隔多个群。
- `FEISHU_ALLOWED_USER_IDS`：可选，逗号分隔允许提交反馈的用户 open_id。
- `FEISHU_REPLY_ENABLED = "false"`：默认不回复，避免额外权限。

`wrangler.toml` 不应提交；仓库只提交 `wrangler.toml.example`。将部署返回的 `https://...workers.dev` 地址填入飞书事件订阅，请求校验会返回 challenge。

## 4. 可选“已记录反馈”回复

如需机器人回复确认，设置：

```bash
npx wrangler secret put FEISHU_APP_ID
npx wrangler secret put FEISHU_APP_SECRET
```

并把 `FEISHU_REPLY_ENABLED` 改为 `"true"`。应用还需“以应用身份发消息”等相应权限。不开启时不影响反馈入库。

## 5. 测试与验收

本地纯模拟测试不会访问飞书或 GitHub：

```bash
npm run test:feishu-feedback
```

部署后：

1. 在允许的群里发送一条标准反馈。
2. 查看 Worker 日志：`npx wrangler tail`。
3. 检查仓库 `data/feedback.json`，应出现 `source: "feishu"`、`sourceEventId` 和 `sourceMessageId`。
4. 重发同一条事件不会新增同 ID 的重复项，而是更新该反馈项。

## 安全与故障行为

- Verification Token 不匹配返回 401。
- 群或用户不在白名单时只返回 ignored，不写 GitHub。
- 非文本、非反馈前缀或格式不合法的消息不写 GitHub。
- GitHub 更新失败时 Worker 返回错误，飞书可重试事件；SHA 冲突最多自动重试三次。
- Token 只保存在 Cloudflare Secret，不写入仓库或日志。
- 不使用数据库；GitHub 文件就是唯一反馈存储。

参考：[飞书消息事件与权限](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/introduction)、[GitHub Contents API](https://docs.github.com/en/rest/repos/contents)。
