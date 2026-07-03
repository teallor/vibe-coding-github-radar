# 每日 AI / Codex / Vibe Coding 雷达｜2026-07-04

> 本文件与当日飞书三合一推送由同一份数据自动生成。Original Author: Rafael_Huang

## 一、Vibe Coding / GitHub Radar

### 1. [obsidian-second-brain](https://github.com/eugeniughelbur/obsidian-second-brain)

- 一句话结论：一个支持 Codex 和 Claude Code 的 Obsidian 跨平台 Skill，通过 44 个指令和自动化 Agent 实现知识库的自我重写与进化。
- 核心内容：开发者 eugeniughelbur 开源了 obsidian-second-brain，这是对 Karpathy LLM Wiki 模式的升级。它提供 44 个跨 CLI（包括 Codex、Claude Code 等）指令，支持笔记自我重写、矛盾自动调和、代码库文档化（/obsidian-architect）以及后台定时 Agent 维护。
- 为什么值得看：原生支持 Codex CLI 和 Claude Code，完美契合 Skill/Agent 方向；提出『自我重写』而非『仅追加』的知识库维护新模式，架构设计极具启发性；包含 44 个实用指令，涵盖代码库文档化、多媒体解析和深度研究，实用价值极高；近 3000 Star 的高活跃开源项目，代码和文档质量高，适合作为课程素材
- Rafael_Huang 可以怎么用：完美契合 Codex、Skill 和 Agent 关注点。该项目展示了如何为 Codex/Claude Code 编写复杂的本地化 Skill，其『自我重写』和『后台 Agent 维护』的架构设计非常适合作为 Vibe Coding 的学习案例，甚至可以转化为一门关于『AI 自动化知识库构建』的课程或副业项目。
- 行动建议：1. Clone 该项目并使用 Codex CLI 在本地 Obsidian 库中运行测试；2. 深入研究其 `/obsidian-architect` 和后台 Agent 的源码实现；3. 考虑将其核心逻辑（如矛盾调和、自我重写）提炼为 Vibe Coding 或 Agent 开发的教学内容。
- 质量评分：92/100
- 最终评审：Gemini 3.1 Pro

### 2. [bagidea-office](https://github.com/bagidea/bagidea-office)

- 一句话结论：一款将 Claude Code 具象化为 2.5D 桌面壁纸的开源虚拟办公环境，原生支持 MCP、插件、多模型切换与 Agent 工作流。
- 核心内容：BagIdea 开源了 bagidea-office，这是一个运行在桌面壁纸上的 AI Agent 虚拟办公室。它以 Claude Code 为底层引擎，支持为不同 Agent 切换不同的大模型（如 DeepSeek、Gemini、本地 Ollama 等），内置 MCP 服务器支持、插件系统、可视化工作流构建器，并具备自动上下文压缩功能。
- 为什么值得看：高度匹配 Codex、Agent、MCP 和插件等核心关注点；创新的 2.5D 桌面壁纸交互形态，将不可见的 Agent 运行过程可视化；内置零依赖的 API Proxy，支持多模型（包括本地 Ollama）无缝接入 Claude Code；支持 MCP 服务器和可视化工作流，具备极高的扩展性和实用价值
- Rafael_Huang 可以怎么用：完美契合你的核心关注点：1. 底层基于 Claude Code，是极佳的 Vibe Coding 学习案例；2. 原生集成 MCP 和插件系统，可研究其架构；3. 包含可视化 Workflow 和 Skills 机制；4. 探索多模型（Swappable Brains）在复杂 Agent 协同中的降本增效实践。
- 行动建议：运行 `npx bagidea` 在本地安装体验；重点阅读其源码中关于 Claude Code 会话管理、MCP 工具调用以及多模型无缝切换（Auto-Compact）的实现逻辑，可为你的课程制作或副业项目提供灵感。
- 质量评分：92/100
- 最终评审：Gemini 3.1 Pro


## 二、Codex / AI Coding 播客雷达

### 1. 跨国串门儿计划｜[#576.Claude Code：工程师如何放大生产力，AI 重塑团队分工的通才时代](https://www.xiaoyuzhoufm.com/episode/6a26a3e4b30e1571aea2b45c?utm_source=rss)

- 时长：29 分钟
- 发布日期：2026-06-08
- 内容大纲：
  - 本期我们克隆了： WorkOS: Boris Cherny: Claude Code & the Future of Engineering | Acquired Unplugged presented by WorkOS
  - 本期嘉宾 Boris Cherny 是 Anthropic 的技术员工，也是 Claude Code 早期核心参与者之一。
  - 在这期节目中，他和 Acquired 的两位主持人 Ben Gilbert、David Rosenthal 深入聊了 Claude Code 的起源、Anthropic 内部如何使用 AI 编程工具，以及 AI 正在怎样重塑工程团队、产品团队乃至整个公司的组织方式。
  - 这不是一场单纯关于“AI 写代码”的访谈。
  - Boris 从 Anthropic 的 AI 安全使命讲起，解释为什么编程是模型与现实世界互动的关键入口；
- 为什么值得听：完美契合 Vibe Coding 和 Agent 理念。播客中提到的“卸载 IDE”、“编写 prompt Claude 的循环”以及“为模型配置公司决策 Skills”等实践，为你的 Codex 课程制作和副业项目开发提供了顶级的行业前沿背书和实操思路。
- 对 Codex / Vibe Coding / 办公自动化的价值：Anthropic 核心成员揭秘 Claude Code 内部实践：AI 编程正推动“通才时代”，开发者应从手写代码转向管理 AI Agent 循环。
- 质量评分：94/100
- 最终评审：Gemini 3.1 Pro

### 2. 跨国串门儿计划｜[#591.Matt Pocock：开发者如何用 AI 放大十倍产出，模型狂热时代的软件基本功](https://www.xiaoyuzhoufm.com/episode/6a353df14233e62bc54c7124?utm_source=rss)

- 时长：58 分钟
- 发布日期：2026-06-19
- 内容大纲：
  - 本期我们克隆了：David Ondrej 的 AI 与软件工程访谈 《Matt Pocock’s Agentic Engineering Workflow (just copy him)》
  - 原内容更新时间：2026-06-18
  - 本期嘉宾 Matt Pocock 是 TypeScript 与开发者教育领域极具影响力的创作者，他和主持人 David Ondrej 深入讨论了 AI 编程时代，开发者真正应该提升的能力是什么。
  - Matt 的核心观点非常鲜明：AI 已经非常擅长 tactical programming，也就是写代码、改 bug、做 commit 这些战术性工作；
  - 但人类开发者必须更擅长 strategic programming，也就是软件设计、代码库架构、任务拆分、测试策略、产品判断和长期方向。
- 为什么值得听：完美契合 Rafael 对 Vibe Coding、Skills、Agent 和课程制作的关注。Matt 提到的 teach skill 直接对应课程制作，grill me skill 和清空 MCP server 的建议对优化 Codex/AI 编程工作流极具实操指导意义。
- 对 Codex / Vibe Coding / 办公自动化的价值：Matt Pocock 深度分享 Agentic Engineering 工作流，强调通过优化代码库、使用特定 Skill（如 teach/grill me）和 AFK 智能体来提升 AI 编程产出。
- 质量评分：93/100
- 最终评审：Gemini 3.1 Pro


## 三、AI C端应用与 Codex 生态更新雷达

### 1. [Likaxy/excel-agent-skills](https://github.com/Likaxy/excel-agent-skills)

- 类型：其他
- 来源：GitHub
- 发生了什么：开发者 Likaxy 在 GitHub 开源了 excel-agent-skills 项目，基于 openpyxl 提供了 25 种 Excel 操作技能，支持作为 MCP 或命令行工具供 AI Agent（如 Claude Code）调用，且无需本地安装 Excel 软件。
- C端用户能怎么用：在进行 Vibe Coding 或构建办公自动化 Agent 时，直接将此库作为 MCP 接入，让 AI 具备读取、修改、格式化 Excel 文件的能力，用于副业项目的数据处理或课程资料整理。
- 对 Rafael_Huang 的价值：完美契合你对 Excel 自动化、MCP 和 Agent Skills 的关注。你可以直接将其集成到 Claude Code 或自定义 Agent 中，大幅提升处理表格数据的效率，且无需依赖本地 Office 环境。
- 是否适合让 Codex 集成或复现：极高。该项目原生支持作为 Agent Skills 和 MCP 运行，非常适合与 Claude Code (cc) 或其他支持 MCP 协议的 AI 编码助手结合，实现基于自然语言的 Excel 自动化处理。
- 行动建议：克隆该 GitHub 仓库，查看其 MCP 配置文档，尝试将其接入你常用的 AI 助手（如 Claude Desktop 或 Cursor），测试几个基础的 Excel 读写命令。
- 质量评分：93/100
- 最终评审：Gemini 3.1 Pro

### 2. [New OpenAI Academy courses for the next era of work](https://openai.com/index/academy-courses-applying-ai-at-work)

- 类型：Skill
- 来源：OpenAI News
- 发生了什么：OpenAI 发布了三门 Academy 课程，旨在帮助用户掌握实用的 AI 技能，创建自动化的可重复工作流，并将 Agent 深度应用于日常办公场景中。
- C端用户能怎么用：普通用户和职场人士可以通过学习这些课程，掌握如何利用 AI 和 Agent 优化日常办公流程，实现工作流的自动化与效率提升。
- 对 Rafael_Huang 的价值：高度契合你的核心关注点：课程内容直接涉及 Agent 应用和工作流自动化（Office 自动化），不仅能提升你自身的 AI 技能，还能为你制作相关 AI 课程或副业项目提供官方权威的参考素材与最佳实践。
- 是否适合让 Codex 集成或复现：课程中关于 Agent 和工作流构建的理念，可直接应用于 Codex 的 Skill 编写和复杂任务编排中，帮助你更好地设计自动化脚本和提升 Vibe Coding 的效率。
- 行动建议：建议立即访问 OpenAI Academy 体验这三门课程，提取其中的 Agent 最佳实践和工作流模板，并考虑将其转化为你的 AI 课程内容或 Codex Skill 脚本。
- 质量评分：91/100
- 最终评审：Gemini 3.1 Pro
- 适合解决的问题：普通用户和职场人士可以通过学习这些课程，掌握如何利用 AI 和 Agent 优化日常办公流程，实现工作流的自动化与效率提升。
- 使用门槛：以原始发布说明为准
- 是否需要 API Key / Token：未知，需查看原始文档
- 是否适合小白：较适合，建议先做最小复现
- 是否值得保存到工具库：是，值得保存并后续复现


## 四、今日总评

- 今日最终入选：6 条
- 三类分别入选：GitHub 2；播客 2；AI 应用生态 2
- GitHub 候选：317/300；Gemini 成功：8
- 播客候选：721/100；Gemini 成功：8
- AI 应用生态候选：143；Gemini 成功：12
- 原则：真实来源建池、规则守硬门槛、Gemini 3.1 Pro 最终语义评审；宁缺毋滥。

---

生成时间：2026-07-03T23:46:25.610Z
