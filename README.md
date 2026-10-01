# BBOS — Buckyball Operating System

BBOS 是面向 **Buckyball DSA（领域特定架构）开发工作流** 的桌面端集成栈。它把 AI 助手、EDA 工作台、SDK 网关放到一组**进程边界清晰、可降级耦合**的子项目里，让研究者和工程师围绕同一份仓库（`buckyball/`）做加速器设计、仿真、回归与自动化。

> 顶层视角：**BBOS 不包含 DSA 业务逻辑**——它是把 `buckyball/`（Chisel 硬件、`bbdev/` 工具链、`bb-tests/` 工作负载）的功能，以桌面应用 + AI 的形态暴露给用户。

---

## 目录结构

```
bbos/
├── agent/          # BB-Agent：Electron + Bun 的通用 AI 桌面助手（可独立运行）
├── design/         # 设计文档与方案（不含运行时代码）
│   ├── dev.md                       # 云端化开发计划（v0.1）
│   ├── agent-bbserver-integration.md # BB-Agent ↔ bbdev 集成设计（v2，纯 MCP）
│   ├── eda-layout-proposal.md       # EDA Workbench 页面改造方案（v0.3）
│   ├── PROJECT_ANALYSIS.md          # buckyball 上游分析
│   └── agent/ecos-studio/           # 历史参考实现（ECOS Studio，vendor）
├── INTEGRATION.md  # 三方角色矩阵、进程拓扑、契约档位（agent ↔ gui ↔ backend）
└── README.md       # 本文件
```

---

## 三个子项目（按 `INTEGRATION.md` 角色矩阵）

| 子项目 | 路径 | 角色 | 状态 |
|---|---|---|---|
| **`bbos/agent`** | 本仓库 `agent/` | 通用 AI 桌面助手 —— LLM / MCP / Skills / 多 provider / 跨会话记忆 / 定时任务 / 浏览器与电脑控制 | ✅ 独立可运行（Electron + Bun） |
| **`bbos/gui`** | 计划独立仓库 | Tauri 集成壳 —— chip/design/ball/sim 编辑器，右栏内嵌 agent | ❌ 当前 AgentPanel 是 mock，详见 [INTEGRATION.md §4.3](./INTEGRATION.md) |
| **`bbos/backend`** | 已退役 | Rust bb-server（HTTP+SSE，tokio worker pool） | ❌ v2 方案被 `agent-bbserver-integration.md` 退役，bbdev/mcp 升为唯一网关 |

**当前形态**：本仓库**仅包含 `agent/`** 一个可运行的子项目；`design/` 提供规划与参考；`backend/` 的设计意图已合并进 `agent-bbserver-integration.md` v2。

### 角色边界（速记）

| 候选功能 | 归属 |
|---|---|
| 调 `bbdev verilator` 跑仿真 | **agent** 经 `bbdev/mcp`（v2 设计） |
| 调 LLM 生成 Verilog | **agent** |
| 在 chip 编辑器里点"让 AI 优化" | **gui**（按钮）+ 转发到 **agent** |
| 解析 `chip.toml`、管 jobs | **gui** 自己完成；agent 不感知 bbos 业务 |

> 进程间**不共享 UI 组件、不共享 JS/TS 包**，唯一共享的是协议 schema（JSON / OpenAPI / Rust types）。

---

## `bbos/agent` — BB-Agent

BB-Agent 是 BBOS 里唯一当前在跑的产品。它 fork 自 [`imagist13/bbos/agent`](https://github.com/imagist13/bbos/agent)，是一台本地优先的桌面 AI Agent。

### 核心特性

- **多供应商** —— Anthropic / Google Gemini / 任意 OpenAI 兼容端点 / Ollama 本地模型 / Claude Code & Gemini CLI & Codex；密钥走系统钥匙串本地加密
- **MCP** —— 接入 Model Context Protocol（stdio / HTTP / SSE），导入主流工具，支持第三方 OAuth
- **Skills** —— 把可复用流程打包成 SKILL.md，渐进披露；从 Claude Code / Codex / .Agents 多源读取，按统计过滤无用描述
- **Subagents** —— 大任务拆给专注子 agent，隔离上下文执行并汇报
- **跨会话记忆** —— `get-acquainted` 录入用户身份，会话过程中自动写入全局/项目域记忆，后台自动总结
- **定时任务** —— Agent 创建的 cron 任务，自动化重复工作
- **浏览器控制** —— 用你的 Chrome 浏览/操作，复用已登录态
- **电脑操作**（仅 macOS）—— 看屏幕、点击、输入，操作原生应用

### 架构

```
Renderer (React + TanStack Router + TipTap)
   ├── tRPC over IPC    —— CRUD / 配置
   └── HTTP data-stream —— 对话流
库
Main Process (Node + Bun)
   ├── Agent runtime (Vercel AI SDK，stream/tool/memory)
   ├── tRPC routers (chat, mcp, models, providers, skills, threads, memory, projects)
   ├── SQLite (Drizzle) + pi-session-backend
   ├── MCP manager
   └── Electron 窗口 / 菜单 / 系统托盘
```

详细架构与原则见 [`agent/CLAUDE.md`](./agent/CLAUDE.md)。

### 快速开始

前置依赖：[Bun](https://bun.sh/)，以及编译 `better-sqlite3` 的 C/C++ 工具链（macOS 装 Xcode CLT，Linux 装 `build-essential`，Windows 装 Visual Studio C++ workload）。

```bash
cd agent
bun install        # postinstall 会为 Electron 重新编译原生模块
bun run dev        # Electron + Vite，带 HMR
```

首次启动后，**设置 → 提供商** 启用某个 provider 并粘贴 key。

```bash
bun run check      # biome lint + tsc 类型检查（提交前必跑）
bun test           # 单元测试
bun run build      # 类型检查 + 打包到 out/
bun run build:mac  # 打 .dmg（另有 build:win / build:linux）
```

更多细节与中文版本见 [`agent/README.zh-CN.md`](./agent/README.zh-CN.md)。

---

## `bbos/design` — 设计文档

历史与规划文档。**不包含运行时代码**——只是当前决策的依据。

| 文档 | 状态 | 摘要 |
|---|---|---|
| [`dev.md`](./design/dev.md) | v0.1 | BB-Agent 云端化开发计划：拆 `src/core/`（纯 Node）+ HTTP/WS 入口，单 build 双模式（Electron 客户端 / 浏览器访问同机 core） |
| [`agent-bbserver-integration.md`](./design/agent-bbserver-integration.md) | v2 | BB-Agent ↔ bbdev 集成设计：**退役** Rust bb-server，`bbdev/mcp` 升为唯一 DSA 网关。LLM 通过 MCP 自动发现 44+3 个 tool |
| [`eda-layout-proposal.md`](./design/eda-layout-proposal.md) | v0.3 | `/eda` 工作台改造方案，把伪 IDE 改成 **Home / Sim / Synth / Chat** 四页 schema-driven 工作台 |
| [`PROJECT_ANALYSIS.md`](./design/PROJECT_ANALYSIS.md) | — | 上游 `buckyball/` 仓库分析（Chisel/Bebop/bbdev/verify/examples） |
| [`agent/ecos-studio/`](./design/agent/ecos-studio/) | 参考 | 历史 vendor：ECOS Studio（RTL-to-GDS 一站式硅设计解决方案）的完整快照，含 GUI / ECC / PDK 资料库。**仅参考**，不是 BBOS 当前栈。详见根目录 `/design/agent/ecos-studio/README.md` |

### 演进路线（来自 `INTEGRATION.md` §9）

| 阶段 | 目标 |
|---|---|
| **M1**（当前） | GUI + bb-server 稳定；AgentPanel 是 mock（已完成演进至"纯 MCP"，见 v2 设计） |
| **M2** | 物理删除 `design/frontend/` 旧 demo |
| **M3** | 引入 `bbos/protocol/`（crate + package）共享 JobState / ChipConfig |
| **M4** | agent 支持 `--embed` 模式 + HTTP 端口 |
| **M5** | GUI AgentPanel 切到 iframe（档位 2） |
| **M6** | `bbos/agent/` 升级为 git submodule 或独立 repo |
| **M7** | agent、gui、bb-server（已退役）各自独立 release 与集成测试 |

---

## 进程拓扑与契约

三方通过**进程边界**而非代码 import 解耦：

```
Desktop
┌───────────────────────────────────────────────────────┐
│  BB-Agent (Electron, bbos/agent)                     │
│  IPC + tRPC + HTTP data-stream                       │
│  LLM / MCP / Skills / Threads / Memory               │
└──────────────────────────────┬────────────────────────┘
                               │ stdIO（MCP，v2 设计）
                               ▼
                    ┌──────────────────────┐
                    │ bbdev/mcp (Python)   │
                    │ 44+3 tool, lazy 启动  │
                    └──────────┬───────────┘
                               │ nix develop
                               ▼
                    ┌──────────────────────┐
                    │ bbdev (Motia, nix)   │
                    │ verilator/firesim   │
                    └──────────────────────┘
```

完整规范：

- **角色矩阵 / 端口分配 / 安全边界 / 反模式** → [`INTEGRATION.md`](./INTEGRATION.md)
- **bbdev/mcp 集成契约（v2）** → [`design/agent-bbserver-integration.md`](./design/agent-bbserver-integration.md)
- **云端化 / core 拆分** → [`design/dev.md`](./design/dev.md)

---

## 安全与边界

| 边界 | 规则 |
|---|---|
| Renderer → 本地 fs | 必须经 tRPC router 走 `FsBackend`（Phase 1+） |
| GUI ↔ Agent iframe | Tauri CSP 白名单 `http://127.0.0.1:4310`（规划中）；不允许外网 |
| Agent → bb-server | ❌ **不允许** —— agent 与 bb-server 互不感知（v2 已退役 bb-server） |
| 跨进程 secret | ❌ LLM key / bearer token 不进 TOML / 日志 / URL 参数 |
| Agent 升级 | 升级外部 fork 时检查上游是否加网络行为 |

详细反模式清单与 CI 拦截项见 [`INTEGRATION.md` §8](./INTEGRATION.md)。

---

## 贡献

`bbos/agent/` 当前遵循 Angular Conventional Commits（`type(scope): subject`），PR **仅 squash-merge**，见 [`agent/CLAUDE.md`](./agent/CLAUDE.md)。

修改跨进程契约（schema）时，agent / gui / backend（v2 已退役）必须**三处同步升级**，CI 检查 git blame 跨仓库改动。

## 许可证

[MIT](./agent/LICENSE) © Buckyball Team