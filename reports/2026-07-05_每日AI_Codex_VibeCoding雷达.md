# 每日 AI / Codex / Vibe Coding 雷达｜2026-07-05

> 本文件与当日飞书三合一推送由同一份数据自动生成。Original Author: Rafael_Huang

## 一、Vibe Coding / GitHub Radar

### 1. [claude-code-local](https://github.com/nicedreamzapp/claude-code-local)

- 一句话结论：在 Apple Silicon Mac 上 100% 本地离线运行 Claude Code 的开源方案，支持 DeepSeek V4 Flash 等大模型。
- 核心内容：开发者开源了 claude-code-local，通过构建 MLX 原生的 Anthropic API 兼容服务器，让用户能在 Mac 上完全离线（Airgap）运行官方的 Claude Code CLI 工具，支持 Gemma 4 31B、Qwen 3.5 122B 及最新的 DeepSeek V4 Flash 模型。
- 为什么值得看：直接赋能 Vibe Coding，解决云端大模型处理敏感代码时的隐私痛点。；支持最新的 DeepSeek V4 Flash 和 Qwen 3.5，技术栈前沿 (MLX, ds4)，且提供 1M Token 上下文支持。；GitHub 接近 3000 Star，提供详细的 Benchmark 和视频演示，可复现性强。
- Rafael_Huang 可以怎么用：完美契合 Vibe Coding 和 Agent 探索方向。该项目展示了如何通过兼容 Anthropic API 来驱动官方 Agent 工具，对于研究 Codex 本地化改造、构建隐私安全的本地工作流极具参考价值。
- 行动建议：克隆该项目并在配备 32GB 以上内存的 Mac 上测试 Gemma 4 31B 模型，体验本地运行 Claude Code 的流畅度；研究其 API 兼容层的实现逻辑，为后续 Codex 接入本地模型做技术储备。
- 质量评分：91/100
- 最终评审：Gemini 3.1 Pro
- 反馈ID：github:nicedreamzapp/claude-code-local
- 是否重复：否
- 首次推送日期：本次首次
- 上次推送日期：无
- 是否已有反馈：否
- 本次为什么允许推送：never_pushed
- 反馈录入命令：
  `node scripts/record-feedback.js --id "github:nicedreamzapp/claude-code-local" --feedback "已读不错"`
  `node scripts/record-feedback.js --id "github:nicedreamzapp/claude-code-local" --feedback "已读不行"`
  `node scripts/record-feedback.js --id "github:nicedreamzapp/claude-code-local" --feedback "重复了"`
  `node scripts/record-feedback.js --id "github:nicedreamzapp/claude-code-local" --feedback "允许继续追踪"`

### 2. [obsidian-second-brain](https://github.com/eugeniughelbur/obsidian-second-brain)

- 一句话结论：一个原生支持 Codex 和 Claude Code 的 Obsidian 跨平台 Skill，通过 44 个指令和自动化 Agent 实现知识库的自我重写与维护。
- 核心内容：开发者开源了 obsidian-second-brain，这是一个基于 Karpathy LLM Wiki 模式演进的跨 CLI Skill（支持 Codex、Claude Code、Gemini 等）。它包含 44 个命令，能通过 Agent 自动重写笔记、解决冲突、进行网络检索，甚至扫描代码库生成架构文档（/obsidian-architect）。
- 为什么值得看：高度匹配 Codex 和 Skill 标签，原生支持 Codex CLI 和 Claude Code；包含 44 个实用指令和 4 个后台 Agent，自动化程度高，展示了高级的 Vibe Coding 玩法；2.9k Star 的优质 Python 开源项目，代码架构和 Prompt 设计具有极高学习价值；创新性地将 AI 辅助编程工具的 CLI 用于个人知识库管理，思路新颖
- Rafael_Huang 可以怎么用：完美契合 Codex、Skill 和 Agent 方向。该项目展示了如何为 Codex/Claude Code 编写复杂的跨平台 Skill，包含丰富的 Prompt 模式、本地文件操作和 Agent 调度逻辑，非常适合作为 Vibe Coding 的学习案例，或提取其机制用于课程制作与副业项目开发。
- 行动建议：建议 Clone 该项目，重点阅读其指令注册机制（Command Schema）和 Agent 调度逻辑，测试其在 Codex CLI 下的实际表现。可提取其核心的“自我重写”和“冲突解决”逻辑，用于自己的效率工具开发。
- 质量评分：91/100
- 最终评审：Gemini 3.1 Pro
- 反馈ID：github:eugeniughelbur/obsidian-second-brain
- 是否重复：否
- 首次推送日期：本次首次
- 上次推送日期：无
- 是否已有反馈：否
- 本次为什么允许推送：never_pushed
- 反馈录入命令：
  `node scripts/record-feedback.js --id "github:eugeniughelbur/obsidian-second-brain" --feedback "已读不错"`
  `node scripts/record-feedback.js --id "github:eugeniughelbur/obsidian-second-brain" --feedback "已读不行"`
  `node scripts/record-feedback.js --id "github:eugeniughelbur/obsidian-second-brain" --feedback "重复了"`
  `node scripts/record-feedback.js --id "github:eugeniughelbur/obsidian-second-brain" --feedback "允许继续追踪"`


## 二、Codex / AI Coding 播客雷达

### 1. 跨国串门儿计划｜[#577.长时运行 Agent：开发者如何让 AI 连续干活不跑偏，模型前沿快速迁移下的工程取舍](https://www.xiaoyuzhoufm.com/episode/6a26b911b30e1571aea2c09d?utm_source=rss)

- 时长：58 分钟
- 发布日期：2026-06-09
- 内容大纲：
  - 本期我们克隆了：AI Engineer Conference 的技术分享 《Build Agents That Run for Hours (Without Losing the Plot)》— Ash Prabaker & Andrew Wilson, Anthropic
  - 本期节目是一场非常硬核但极具实践价值的 Agent 工程分享。
  - 来自 Anthropic 应用 AI 团队的 Ash Prabaker 和 Andrew Wilson，系统拆解了一个关键问题：如果我们希望 AI Agent 不只是完成几分钟的小任务，而是能连续运行数小时、甚至几天，构建完整应用、调试复杂系统、持续自我推进，工程上到底需要做什么？
  - Andrew 先回顾了 Claude Code 和 Agent SDK 在过去一年中的演进：从早期模型只能跑二十分钟，到如今可以在合适的 harness 下运行数小时甚至更久；
  - 从 Computer Use、MCP、skills、检查点、Agent teams，到服务端压缩和百万上下文窗口，模型能力和脚手架设计一直在彼此塑造。
- 为什么值得听：高度契合你的核心关注点（Agent、MCP、Skills、AI 编程）。播客中提到的 Claude Code 实践、MCP 插件调用（如 Playwright MCP）、以及如何通过留下 JSON 状态文件来维护长期项目，对你的副业项目开发和 Vibe Coding 极具指导价值。
- 对 Codex / Vibe Coding / 办公自动化的价值：Anthropic 官方硬核分享：如何通过拆分角色、MCP与严格评估机制，构建能连续运行数小时的 AI Agent。
- 质量评分：92/100
- 最终评审：Gemini 3.1 Pro
- 反馈ID：podcast:c07014b7
- 是否重复：否
- 首次推送日期：本次首次
- 上次推送日期：无
- 是否已有反馈：否
- 本次为什么允许推送：never_pushed
- 反馈录入命令：
  `node scripts/record-feedback.js --id "podcast:c07014b7" --feedback "已读不错"`
  `node scripts/record-feedback.js --id "podcast:c07014b7" --feedback "已读不行"`
  `node scripts/record-feedback.js --id "podcast:c07014b7" --feedback "重复了"`
  `node scripts/record-feedback.js --id "podcast:c07014b7" --feedback "允许继续追踪"`

### 2. 跨国串门儿计划｜[#544. HTML 是新的 Markdown：用AI生成动态 Spec](https://www.xiaoyuzhoufm.com/episode/6a0d679c1b7bd5029580b25f?utm_source=rss)

- 时长：33 分钟
- 发布日期：2026-05-20
- 内容大纲：
  - 本期我们克隆了：AI 工具实践播客《How I AI》 Why this Claude Code engineer uses HTML files as AI specs | Thariq Shihipar (Anthropic)
  - 本期节目来自 Anthropic 的 Code with Claude 开发者大会现场。
  - 主持人 Clara Vo 邀请参与 Claude Code 工作的 Thariq Shihipar，讨论一个正在悄悄改变 AI 编程工作流的趋势：HTML 正在成为人与 Agent 协作的新型文档格式。
  - 过去，很多人用 Markdown 写 PRD、spec、实现计划，再交给 AI 执行。
  - 但随着 Agent 可以运行更久、处理更复杂的任务，计划文档越来越长，人类反而越来越不愿意读。
- 为什么值得听：高度契合 Vibe Coding 和 Agent 工作流。提供了一种全新的 Prompt/Spec 编写思路（HTML 替代 Markdown），有助于在开发副业项目或制作课程时，构建更高效的人机协作界面和微型工具（Micro App）。
- 对 Codex / Vibe Coding / 办公自动化的价值：Anthropic 工程师分享前沿 Vibe Coding 理念：用交互式 HTML 替代 Markdown 作为 AI Agent 的需求文档（Spec）。
- 质量评分：92/100
- 最终评审：Gemini 3.1 Pro
- 反馈ID：podcast:46202b88
- 是否重复：否
- 首次推送日期：本次首次
- 上次推送日期：无
- 是否已有反馈：否
- 本次为什么允许推送：never_pushed
- 反馈录入命令：
  `node scripts/record-feedback.js --id "podcast:46202b88" --feedback "已读不错"`
  `node scripts/record-feedback.js --id "podcast:46202b88" --feedback "已读不行"`
  `node scripts/record-feedback.js --id "podcast:46202b88" --feedback "重复了"`
  `node scripts/record-feedback.js --id "podcast:46202b88" --feedback "允许继续追踪"`


## 三、AI C端应用与 Codex 生态更新雷达

### 1. [JSONbored/awesome-claude](https://github.com/JSONbored/awesome-claude)

- 类型：其他
- 来源：GitHub
- 发生了什么：GitHub 上开源了 JSONbored/awesome-claude (HeyClaude) 项目，这是一个专门针对 Claude 及 AI 工作流资产的注册表和分发平台，集中收录了大量 Agents、MCP 服务器、Skills、指令、规则及开发指南。
- C端用户能怎么用：开发者和 AI 玩家可以通过该仓库快速查找并安装适用于 Claude Desktop 或其他支持 MCP 协议的客户端（如 Cursor、Codex）的插件、Skills 和 MCP 服务器，从而大幅扩展本地 AI 的能力（如文件处理、API 接入、自动化操作等）。
- 对 Rafael_Huang 的价值：完美契合你对 MCP、Skills、Agent 和 GitHub 开源项目的关注。你可以从中挖掘高质量的 MCP 服务器和 Skills，用于优化你的 Vibe Coding 工作流，甚至为你的副业项目或课程制作寻找灵感和现成工具。
- 是否适合让 Codex 集成或复现：该仓库中收录的 MCP 服务器和 Skills 可直接为 Codex 或类似支持 MCP 的 AI 编程助手提供扩展能力，增强代码生成、本地环境交互和自动化任务处理。
- 行动建议：访问该 GitHub 仓库，重点浏览 mcp-servers 和 claude-skills 标签下的项目，挑选 1-2 个与 Office 自动化或日常开发相关的工具进行本地测试与集成。
- 质量评分：93/100
- 最终评审：Gemini 3.1 Pro
- 反馈ID：aiapp:a5d3a50a
- 是否重复：否
- 首次推送日期：本次首次
- 上次推送日期：无
- 是否已有反馈：否
- 本次为什么允许推送：never_pushed
- 反馈录入命令：
  `node scripts/record-feedback.js --id "aiapp:a5d3a50a" --feedback "已读不错"`
  `node scripts/record-feedback.js --id "aiapp:a5d3a50a" --feedback "已读不行"`
  `node scripts/record-feedback.js --id "aiapp:a5d3a50a" --feedback "重复了"`
  `node scripts/record-feedback.js --id "aiapp:a5d3a50a" --feedback "允许继续追踪"`

### 2. [min9lin9/kimi-agent-swarm-skill](https://github.com/min9lin9/kimi-agent-swarm-skill)

- 类型：其他
- 来源：GitHub
- 发生了什么：开发者 min9lin9 在 GitHub 开源了 kimi-agent-swarm-skill，这是一个基于 TypeScript 开发的 Codex 专属 Skill，旨在实现类似 Kimi 的 Swarm 风格提示词优化和经过验证的工作流路由功能。
- C端用户能怎么用：在 Codex 中直接调用该 Skill，利用多智能体（Swarm）协作模式对复杂的提示词进行自动优化，并根据任务类型智能路由到合适的工作流中，提升日常 AI 交互和内容生成的质量。
- 对 Rafael_Huang 的价值：完美契合你对 Codex 生态、Skill 插件以及 Agent 工作流的关注。你可以将其作为副业项目或课程制作中的高级 Prompt 调优工具，甚至研究其源码来提升 Vibe Coding 技巧。
- 是否适合让 Codex 集成或复现：原生 Codex Skill，可直接作为插件集成到 Codex 环境中，扩展其多智能体协作与提示词工程能力。
- 行动建议：访问 GitHub 仓库克隆代码，按照指引将其安装为本地 Codex Skill 并进行测试，评估其在课程制作或日常办公自动化中的实际效果。
- 质量评分：91/100
- 最终评审：Gemini 3.1 Pro
- 反馈ID：aiapp:1b3fff15
- 是否重复：否
- 首次推送日期：本次首次
- 上次推送日期：无
- 是否已有反馈：否
- 本次为什么允许推送：never_pushed
- 反馈录入命令：
  `node scripts/record-feedback.js --id "aiapp:1b3fff15" --feedback "已读不错"`
  `node scripts/record-feedback.js --id "aiapp:1b3fff15" --feedback "已读不行"`
  `node scripts/record-feedback.js --id "aiapp:1b3fff15" --feedback "重复了"`
  `node scripts/record-feedback.js --id "aiapp:1b3fff15" --feedback "允许继续追踪"`

### 3. [New OpenAI Academy courses for the next era of work](https://openai.com/index/academy-courses-applying-ai-at-work)

- 类型：Skill
- 来源：OpenAI News
- 发生了什么：OpenAI 官方发布了三门 Academy 课程，旨在帮助用户掌握实用的 AI 技能，创建可重复的自动化工作流，并将 Agent 实际应用于日常办公场景中。
- C端用户能怎么用：职场人士和普通用户可以通过这些免费或官方课程，系统学习如何利用 AI 和 Agent 打造自动化工作流，从而大幅提升日常办公效率。
- 对 Rafael_Huang 的价值：高度契合你对『Agent』、『Skills』与『Office 自动化』的关注。不仅能直接提升你构建 Agent 工作流的能力，其官方课程的内容组织和教学设计也可为你自己的『课程制作』和『副业项目』提供权威的对标参考。
- 是否适合让 Codex 集成或复现：课程中教授的 Agent 逻辑和可重复工作流（Repeatable workflows）构建方法，可直接提炼并转化为 Codex 中的自定义 Skill 或结合 MCP 插件，用于实现更复杂的 Office 自动化任务。
- 行动建议：建议立即访问 OpenAI Academy 浏览这三门新课程的大纲，重点学习 Agent 应用与工作流构建模块，尝试将其转化为 Codex 的专属 Skill；同时可拆解其课程结构，作为你 AI 课程制作副业的灵感来源。
- 质量评分：92/100
- 最终评审：Gemini 3.1 Pro
- 适合解决的问题：职场人士和普通用户可以通过这些免费或官方课程，系统学习如何利用 AI 和 Agent 打造自动化工作流，从而大幅提升日常办公效率。
- 使用门槛：以原始发布说明为准
- 是否需要 API Key / Token：未知，需查看原始文档
- 是否适合小白：较适合，建议先做最小复现
- 是否值得保存到工具库：是，值得保存并后续复现
- 反馈ID：aiapp:dd73139d
- 是否重复：是
- 首次推送日期：2026-07-03
- 上次推送日期：2026-07-03
- 是否已有反馈：否
- 本次为什么允许推送：already_pushed_without_feedback
- 重复说明：⚠️ 重复推送：这条内容曾于 2026-07-03 推送过；目前没有收到任何反馈，因此本次允许重复出现。请反馈“已读不错 / 已读不行 / 重复了”，后续系统将据此处理。
- 反馈录入命令：
  `node scripts/record-feedback.js --id "aiapp:dd73139d" --feedback "已读不错"`
  `node scripts/record-feedback.js --id "aiapp:dd73139d" --feedback "已读不行"`
  `node scripts/record-feedback.js --id "aiapp:dd73139d" --feedback "重复了"`
  `node scripts/record-feedback.js --id "aiapp:dd73139d" --feedback "允许继续追踪"`


## 四、今日总评

- 今日最终入选：7 条
- 三类分别入选：GitHub 2；播客 2；AI 应用生态 3
- GitHub 候选：317/300；Gemini 成功：9
- 播客候选：716/100；Gemini 成功：10
- AI 应用生态候选：140；Gemini 成功：11
- 原则：真实来源建池、规则守硬门槛、Gemini 3.1 Pro 最终语义评审；宁缺毋滥。

## 调度异常记录

调度异常记录：目标 06:45，实际 07:38，延迟 53 分钟；原因：GitHub Actions 比计划 06:20 晚启动 66 分钟，且在目标 06:45 之后才启动。请结合 workflow actual start 与内容生成耗时定位。


---

生成时间：2026-07-04T23:38:06.877Z
