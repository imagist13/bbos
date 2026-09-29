# BBOS Integration Contract

> `bbos/agent` ↔ `bbos/gui` ↔ `bbos/backend` 三方职责边界、协议契约与集成模式。

**状态**：当前实现中（agent 与 gui 解耦运行，gui 中 AgentPanel 为 mock）
**最后更新**：2026-09-28
**维护者**：BBOS 架构组

---

## 0. TL;DR

- **`bbos/backend`（bb-server）** 是 BBOS 的 **DSA 工具网关** —— 管理工作区、调 `bbdev` 子进程、流式日志。它**不**包含任何 AI 逻辑。
- **`bbos/agent`（BB-Agent）** 是**通用 AI 桌面助手** —— LLM / MCP / Skills / 多 provider。它**不**了解 Buckyball 业务。
- **`bbos/gui`（BBOS GUI）** 是**集成壳** —— 用 Tauri 调用 bb-server 完成 DSA 工作，可在右侧栏打开 agent 聊天。

三方通过**进程边界**而非代码 import 解耦。**没有共享 UI 组件，没有共享 JS/TS 包**，唯一共享的是协议 schema（JSON / OpenAPI / Rust types）。

---

## 1. 角色矩阵

| 维度 | `bbos/backend` | `bbos/agent` | `bbos/gui` |
|---|---|---|---|
| **做什么** | 调 bbdev、解析 TOML、管理 job、SSE 日志 | LLM 对话、MCP 接入、Skills、子 agent | 配置编辑器、仿真面板、ball ISA 编辑器 |
| **进程模型** | 独立 Rust 进程（sidecar） | 独立 Electron 应用 | Tauri 主进程 + Webview 渲染 |
| **暴露给外部的接口** | axum HTTP + SSE（loopback） | tRPC over Electron IPC | Tauri command → Renderer；fetch → bb-server / agent |
| **是否知道对方存在** | ❌ 只知道 bbdev 和 TOML 文件 | ❌ 不感知 bbos | ✅ 知道 bb-server 和 agent |
| **是否实现 AI 逻辑** | ❌（spec.md §1.2 明确禁止） | ✅ | ❌（只调用） |
| **是否实现 DSA 工具逻辑** | ✅ | ❌ | ❌（只调用） |
| **能否独立运行** | ✅ | ✅ | ❌（依赖 bb-server） |

**判断口诀**：

| 候选功能 | 问自己一个问题 | 归属 |
|---|---|---|
| 调 `bbdev verilator` | "这是 DSA 工作流吗？" → 是 | `bbos/backend` |
| 调 LLM 生成 Verilog | "需要 LLM 吗？" → 是 | `bbos/agent` |
| 在 chip 编辑器里点 "让 AI 优化" | "AI 在哪跑？" → 在 agent；"按钮在哪？" → 在 gui | `bbos/gui`（按钮）+ 转发到 `bbos/agent` |
| 保存 chip.toml | "IO 边界在哪？" → backend 的 ProjectService | `bbos/backend` |

---

## 2. 进程拓扑

```
┌─────────────────────────────────────────────────────────────────┐
│  Desktop                                                        │
│                                                                 │
│  ┌─────────────────────────────────────────┐                    │
│  │  BB-Agent (Electron, bbos/agent)        │                    │
│  │  端口: Electron IPC + tRPC (内部)        │  ◀── 独立 release  │
│  │  LLM / MCP / Skills / Threads / Memory  │                    │
│  └─────────────────────────────────────────┘                    │
│           ▲                                                     │
│           │ HTTP (loopback)  ←  可选，仅当 BBOS GUI             │
│           │   想要"嵌入式 agent"时打开                            │
│           │                                                     │
│  ┌─────────────────────────────────────────┐                    │
│  │  BBOS GUI (Tauri, bbos/gui)             │  ◀── 主产品        │
│  │  ┌───────────────────────────────────┐  │                    │
│  │  │  Tauri Main (Rust)                │  │                    │
│  │  │  ├── spawn bb-server as sidecar   │  │                    │
│  │  │  ├── fetch http://127.0.0.1:<P>   │  │                    │
│  │  │  └── shell.open(agent://...)      │  │                    │
│  │  └───────────────────────────────────┘  │                    │
│  │  ┌───────────────────────────────────┐  │                    │
│  │  │  Webview (React)                  │  │                    │
│  │  │  ChipEditor / DesignEditor / ...  │  │                    │
│  │  │  RightPanel → AgentPanel (mock)   │  │                    │
│  │  └───────────────────────────────────┘  │                    │
│  └──────────────────┬──────────────────────┘                    │
│                     │ HTTP / SSE (loopback)                      │
│                     ▼                                           │
│  ┌─────────────────────────────────────────┐                    │
│  │  bb-server (Rust, bbos/backend)        │  ◀── sidecar        │
│  │  axum HTTP + SSE                       │                    │
│  │  tokio::process → bbdev (nix/bbdev)    │                    │
│  └─────────────────────────────────────────┘                    │
│                     │                                           │
└─────────────────────┼───────────────────────────────────────────┘
                      ▼
              ┌───────────────────┐
              │  bbdev (nix bash) │
              │  → verilator      │
              │  → firesim        │
              │  → p2e            │
              └───────────────────┘
```

**关键约束**：

1. **bb-server 与 bb-agent 互不感知** —— 两条独立的 localhost 网络。
2. **bb-server 与 gui 同生命周期** —— gui 启动时拉起 bb-server，退出时 SIGTERM。
3. **bb-agent 独立于 gui 启动** —— 用户可以单独跑 agent（dev 模式或独立 release）。
4. **gui ↔ agent 的耦合是可选的、可降级的** —— agent 不可用时 gui 应优雅降级（"AI 助手离线"）。

---

## 3. bb-server HTTP API 契约

> 完整规范见 [`bbos/design/backend/spec.md`](./design/backend/spec.md) §5。本节为契约摘要，**以 spec.md 为准**。

### 3.1 端口发现

bb-server 启动时监听 `0.0.0.0:0`（随机端口），stdout 输出第一行：

```
LISTENING 127.0.0.1:38421
```

Tauri 主进程读取这一行，存到内存。**禁止硬编码端口，禁止用环境变量预传递**。

### 3.2 端点

| 方法 | 路径 | 用途 | 关键响应 |
|---|---|---|---|
| GET | `/api/health` | 健康检查 | `{ ok: true }` |
| GET | `/api/diagnostics` | bbdev / bb-server 版本、nix 可用性 | 见 spec.md §5.1 |
| GET | `/api/projects` | 列出 workspace 下 chip | `[Project]` |
| GET | `/api/workspace/:chip` | 读取 chip.toml + designs/*.toml | `ChipConfig` |
| PUT | `/api/workspace/:chip` | 写入 chip 配置（带越界检查） | `{}` |
| POST | `/api/jobs` | 发起 job（verilator / workload-build / uvm） | `{ jobId }` |
| GET | `/api/jobs` | 列所有 job | `[JobSummary]` |
| GET | `/api/jobs/:id` | 单 job 状态 | `JobState` |
| GET | `/api/jobs/:id/logs` | **SSE** 日志流 | `event: log / state / exit` |
| POST | `/api/jobs/:id/cancel` | 取消 job | `{ ok: true }` |

### 3.3 GUI 调用模式

```typescript
// gui/src/lib/bb-server.ts  —— 集中封装，禁止散落在组件里
const BASE = `http://127.0.0.1:${port}`;

export async function listJobs(): Promise<JobSummary[]> {
  const r = await fetch(`${BASE}/api/jobs`);
  if (!r.ok) throw new BbServerError(r.status, await r.text());
  return r.json();
}

// SSE 用 EventSource，注意 type='text/event-stream'
export function streamJobLogs(
  jobId: string,
  onLog: (line: string) => void,
  onState: (s: JobState) => void,
  onExit: (code: number) => void,
): EventSource {
  const es = new EventSource(`${BASE}/api/jobs/${jobId}/logs`);
  es.addEventListener("log", e => onLog((e as MessageEvent).data));
  es.addEventListener("state", e => onState(JSON.parse((e as MessageEvent).data)));
  es.addEventListener("exit", e => onExit(JSON.parse((e as MessageEvent).data)));
  return es;
}
```

### 3.4 禁止事项

- ❌ Renderer 直接调 `bbdev` CLI（必须经 bb-server）
- ❌ Renderer 直接读 / 写 `chip.toml`（必须经 bb-server 越界检查）
- ❌ Renderer 起子进程（必须经 bb-server）
- ❌ 把 bb-server 端口暴露到 `0.0.0.0`（**只允许 loopback**）

---

## 4. BB-Agent 集成契约

> 当前 `bbos/agent` 作为**独立 Electron 应用**运行。GUI 与 agent 之间的集成模式分三档，按需启用。

### 4.1 当前状态（2026-09-28）

| 组件 | 状态 |
|---|---|
| `bbos/agent/` 独立可运行 | ✅ Bun + Electron |
| `bbos/agent/` tRPC 端点 | ✅ `src/main/api/trpc/routers/`（chat, mcp, models, providers, skills, threads, memory, projects 等） |
| `bbos/gui/src/components/AgentPanel.tsx` | ⚠️ **Mock 实现**（`setTimeout` 假装回复，无网络） |
| `bbos/gui` 真调 agent | ❌ 尚未实现 |

### 4.2 三档集成模式（推荐：从 #2 开始）

#### 档位 1：完全独立（当前现状）

```
[GUI]   ── 不感知 agent
[Agent] ── 用户单独启动
```

- 用户从系统托盘 / 应用菜单打开 agent。
- GUI 内 AgentPanel 是占位 UI。
- 适用：MVP、agent 还没稳定的早期。

#### 档位 2：GUI 内嵌 Webview / Iframe（推荐起点）

```
[GUI Tauri Main]
  └── shell.open("http://127.0.0.1:<agent-port>")
       │
       ▼
[Agent Electron]  暴露一个 HTTP loopback 端口（需在 agent 加 capability flag）
       │
       ▼
[Agent 的 Web UI（独立 vite 路由，不走 Electron 主壳）]
```

GUI 启动时探测 `127.0.0.1:AGENT_PORT`，可用则在 Webview 里渲染 agent 的 Web UI（一个独立 vite 路由 `/#/agent-embed`），否则降级到 Mock 提示"AI 助手离线"。

**实现要点**：

- agent 需要新增一个 `--embed` 模式启动，关闭 Electron 主窗口，**只**暴露 HTTP 端口（沿用 Vercel AI SDK 的 data-stream protocol 或单独的 `/api/embed/*`）。
- GUI 在 AgentPanel.tsx 里 `<iframe src="http://127.0.0.1:<port>/embed" />`，走 Tauri CSP 白名单。
- GUI → Agent 通信：postMessage（iframe ↔ webview）。
- Agent → GUI 通信：postMessage 触发 `tauri.command('openChipEditor', { file })`。

**优势**：agent 完全独立 release，GUI 不依赖 agent 任何 TS 代码。

#### 档位 3：进程内桥接（**不推荐**，列出供对比）

```
[GUI Tauri Main]
  └── Rust subprocess → BB-Agent (headless)
       └── tauri.invoke → agent's tRPC over stdio JSON-RPC
```

- 把 agent 当成无头进程，通过 stdio 走 JSON-RPC。
- GUI 完全控制 agent 生命周期。
- **代价**：必须把 agent 的 Electron 壳剥离，引入 stdio 适配层。**改造量巨大**，且失去 agent 的 OAuth、MCP、Electron 生态。
- **只在这种场景才考虑**：agent 已经稳定发布、想把它降级为 backend-like 服务。

### 4.3 GUI ↔ Agent 通信契约（档位 2 适用）

> 这是规划中的协议，**还没实现**。先把契约定下来，避免各写各的。

#### 4.3.1 GUI → Agent

| 消息 | Payload | 说明 |
|---|---|---|
| `init` | `{ workspaceRoot: string, activeChip?: string }` | GUI 注入上下文，agent 可读 chip.toml |
| `prompt` | `{ text: string, contextRefs?: ContextRef[] }` | 用户在 GUI 触发"问 AI" |
| `attachFile` | `{ path: string, content: string }` | GUI 把 chip 内容推给 agent 当上下文 |
| `cancel` | `{ threadId: string }` | 取消当前生成 |

#### 4.3.2 Agent → GUI

| 消息 | Payload | 说明 |
|---|---|---|
| `ready` | `{ version, capabilities }` | agent 就绪 |
| `chunk` | `{ threadId, delta }` | 流式增量文本 |
| `toolCall` | `{ tool, args }` | agent 调 MCP tool，GUI 可选择性展示 |
| `navigate` | `{ view: 'chip' \| 'design' \| 'ball' \| 'sim', params }` | agent 请求 GUI 跳转 |
| `error` | `{ code, message }` | 失败 |

#### 4.3.3 共享类型（**计划中，见 §6**）

放在 `bbos/protocol/src/agent-bridge.ts`，双方引用同一份 JSON Schema。

### 4.4 降级策略

agent 不可用时 GUI 必须正常工作：

| 检测 | 行为 |
|---|---|
| GUI 启动时 `127.0.0.1:AGENT_PORT` 连接失败 | AgentPanel 显示"AI 助手离线 — 可手动启动 BB-Agent" |
| agent 进程中途崩溃 | GUI 弹非阻塞提示，自动重试探测 |
| agent 端点返回 503 | AgentPanel 显示降级状态条，不阻塞其他功能 |

---

## 5. 共享契约：`bbos/protocol/`

> **状态**：规划中。`bbos/design/backend/spec.md` §3 提到，但代码尚未创建。

```
bbos/protocol/
├── Cargo.toml         # 给 backend / 未来的 GUI Rust 部分用
├── package.json       # 给 GUI / agent 的 TS 部分用
├── src/
│   ├── error.ts/.rs         # 统一错误码
│   ├── jobs.ts/.rs          # JobId, JobState, JobKind, JobEvent
│   ├── workspace.ts/.rs     # Project, ChipRef, DesignRef, BallRef
│   ├── events.ts/.rs        # SSE event name + payload
│   └── agent-bridge.ts/.rs  # §4.3 的 GUI ↔ Agent 消息协议
└── schemas/                # JSON Schema 单一来源
    ├── workspace.schema.json
    ├── jobs.schema.json
    └── agent-bridge.schema.json
```

**规则**：

- 所有跨进程接口的 schema **必须** 走这里。
- 修改 schema 必须 backend + GUI + agent **三处同步升级**（CI 检查 git blame 跨仓库改动）。
- TypeScript 和 Rust 类型从同一份 JSON Schema 生成（`quicktype` 或 `schemars`）。

---

## 6. 端口与生命周期

### 6.1 端口分配

| 服务 | 默认端口 | 来源 | 配置方式 |
|---|---|---|---|
| bb-server | 0（随机） | bb-server stdout 报告 | `LISTENING 127.0.0.1:<P>` |
| bb-agent（embed 模式） | 待定，暂定 `4310` | agent `--embed --port=4310` | agent 配置 |
| GUI dev server（Vite） | 1420 | Tauri 约定（`tauri.conf.json` devPath） | `gui/package.json` |
| Agent dev server（electron-vite） | 5173 / 渲染端口 | agent 配置 | `agent/package.json` |

**冲突规则**：

- 三个服务都在 loopback，不冲突。
- 启动顺序无所谓，**都是各自独立**。
- bb-server 启动慢（要 spawn bbdev），GUI 必须设置超时（默认 5s）+ 重试。

### 6.2 生命周期

| 事件 | bb-server | GUI | bb-agent |
|---|---|---|---|
| 用户启动 GUI | spawn | 启动 | （用户另行启动） |
| 用户退出 GUI | SIGTERM → graceful drain | 退出 | （继续运行或独立退出） |
| 用户关 agent | 不受影响 | （如已嵌入，提示 agent 离线） | 退出 |
| GUI 重启 | 跟随 | 重启 | 不受影响 |
| bb-server 崩溃 | — | 检测 `/api/health` 失败 → 重启 sidecar + 提示 | 不受影响 |

### 6.3 健康检查

GUI 应每 30s 探测一次 `/api/health`；失败则重试 3 次，仍失败则：

1. 弹非阻塞 toast"后端服务断开，正在重启"
2. 重启 bb-server sidecar
3. 探测新端口，更新内存中的 port
4. 恢复失败期间累积的请求（job 状态查询自动重新拉）

---

## 7. 安全边界

| 边界 | 规则 |
|---|---|
| Renderer → bb-server | ✅ 仅 loopback；必须经 ProjectService 越界检查 |
| Renderer → 本地文件系统 | ⚠️ 仅允许 gui 显式 allowlist 的路径（tauri.conf.json 已设 `fs.readFile/writeFile`） |
| GUI → agent iframe | ⚠️ 必须 Tauri CSP 白名单 `http://127.0.0.1:4310`；不允许外网 |
| agent → GUI postMessage | ⚠️ 必须 `event.origin === 'http://127.0.0.1:4310'` 校验 |
| agent → bb-server | ❌ **不允许**——agent 与 bb-server 互不感知 |
| bb-server → 外网 | ❌ 不允许（除非 bbdev 本身需要） |
| 跨进程 secret | ❌ 不要把 LLM key、bearer token 存进 TOML / 日志 / URL 参数 |

**特别注意**：agent 是 fork 自 `imagist13/bbos/agent`（外部项目）。升级时检查上游是否在悄悄加网络行为。

---

## 8. 反模式（CI 应该拦截）

| 反模式 | 表现 | 后果 |
|---|---|---|
| GUI import agent 代码 | `gui/src/**/*.ts` 里出现 `from "bbos/agent/..."` 或 `from "../../agent/..."` | 耦合加深，agent 一升级 GUI 崩 |
| GUI 直接 spawn bbdev | `tauri::process::Command::new("bbdev")` | 失去 jobs/SSE/取消能力 |
| bb-server 调 LLM | backend crate 里出现 `anthropic` / `openai` 依赖 | 违反 §1 职责分离 |
| agent 解析 chip.toml | agent 里出现 `toml::from_str` 或 `@iarna/toml` | 业务耦合 |
| 硬编码端口 | 代码里出现 `127.0.0.1:38421` / `localhost:3000` | 端口冲突 |
| Renderer 直接 fs | Tauri Renderer 里 `fs.readFile` 不走 command | 绕过 bb-server 越界检查 |
| 共享 React 组件 | 在 `gui/` 和 `agent/` 之间 copy-paste 组件 | 维护噩梦 |
| 在 chip.toml 里写 token | 任何 `*.toml` 包含 `api_key` / `bearer` | 泄露 |

---

## 9. 演进路线

| 阶段 | 目标 | 验证标准 |
|---|---|---|
| **M1（当前）** | GUI + bb-server 稳定；AgentPanel 是 mock | GUI 全部 chip/design/ball/sim 编辑可用；bb-server 通过 spec.md 全部端点测试 |
| **M2** | 把 `bbos/design/frontend/` 旧 demo 物理删除 | working tree 不再有 `bbos/design/frontend/app.js` 等残留 |
| **M3** | 引入 `bbos/protocol/` crate + package | backend / gui 共享同一份 JobState / ChipConfig 类型 |
| **M4** | agent 支持 `--embed` 模式 + HTTP 端口 | `bb-agent --embed --port=4310` 可独立运行，curl 拿到 `ready` |
| **M5** | GUI AgentPanel 切到 iframe（档位 2） | AgentPanel 真发请求，agent 崩溃时 GUI 不崩 |
| **M6** | `bbos/agent/` 升级为 git submodule 或独立 repo | bbos 主仓库可以 `git submodule update` 拿到 agent |
| **M7** | 文档 / CI / release-please 三轨 | agent、gui、bb-server 各自独立 release，集成测试通过 |

---

## 10. 相关文档

- [`bbos/design/backend/spec.md`](./design/backend/spec.md) — bb-server 完整规格（HTTP API、crate 结构、SSE）
- [`bbos/design/frontend/DESIGN.md`](./design/frontend/DESIGN.md) — GUI 设计文档（chip / design / ball / sim 四分区）
- [`bbos/design/frontend/UI_REFERENCE.md`](./design/frontend/UI_REFERENCE.md) — UI 视觉规范
- [`bbos/gui/README.md`](./gui/README.md) — GUI 模块说明
- [`bbos/agent/README.md`](./agent/README.md) — BB-Agent 产品说明
- [`bbos/agent/CLAUDE.md`](./agent/CLAUDE.md) — BB-Agent 工程约束（Vercel AI SDK、目录组织）

---

## 变更记录

| 日期 | 变更 | 作者 |
|---|---|---|
| 2026-09-28 | 初稿：定义三方角色矩阵、进程拓扑、契约档位 | — |