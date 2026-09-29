# BB-Agent ↔ BB-Server ↔ EDA 集成设计

> 把 bb-server 真正接进 BB-Agent，让 EDA 页面从"文件浏览器"变成"可运行仿真、可看日志、可让 AI 改配置的 DSA 工作台"。

**状态**：草案，待评审
**最后更新**：2026-09-29
**作者**：BBOS 架构组
**前置文档**：[`bbos/INTEGRATION.md`](../INTEGRATION.md) · [`bbos/design/backend/spec.md`](./backend/spec.md) · [`bbos/agent/CLAUDE.md`](../agent/CLAUDE.md)

---

## 0. TL;DR

今天的事实：

- `bbos/agent/src/main/bb/bridge.ts` 已经能 spawn bb-server、读 `/api/health`、`/api/projects`、`/api/jobs`、`/api/workspace/:chip`，并把一行 `Current chip: …` 塞进 system prompt。
- `bbos/agent/src/renderer/src/components/gui/EDAPage.tsx` 的右侧 "Agent" tab 是 **mock**（`setMessages` + `send` 都是本地状态）。
- EDA 页面没有任何 "Run" 入口——用户改完 `chip.toml` 必须切回命令行 `bbdev verilator --run ...`。
- `bb-server` 自身根据 [`bbos/backend/README.md`](../backend/README.md) 自承"Worker pool 实际运行 bbdev、Tauri sidecar 集成、集成测试"三项未做。

要做的事，三句话：

1. **补 bb-server 的 worker pool**，让它能真跑 `bbdev`、把 stderr 通过 SSE 推出来。
2. **在 agent 里加一层 `bb.ts` tRPC 路由器** + **EDA 专属 builtin tools**，让 Renderer 和 LLM 都能消费 bb-server。
3. **EDA 页面加 Run Panel + Terminal + 真 Agent tab**，把"改配置 → 跑仿真 → 看日志 → 问 AI"四个动作在同一屏闭环。

---

## 1. 目标 / 非目标

### 1.1 目标

| # | 目标 | 度量 |
|---|---|---|
| G1 | 用户在 EDA 页面能选 chip + simulator + binary，点 Run，仿真在后台跑 | 端到端跑通 `bbdev verilator --run --chip toy --binary ...` |
| G2 | 运行日志通过 SSE 实时刷到 EDA 底部 Terminal Panel | 第一条 stderr 在 200ms 内可见，日志延迟 < 1s |
| G3 | EDA 右侧 Agent tab 是真 chat，能看到当前 active 文件上下文 | 用户选中 `chip.toml` 后问 AI，AI 回复时引用了文件路径/字段名 |
| G4 | LLM 能直接调工具启动 / 取消 / 查询仿真 | 用户说"跑一下 toy 的 matmul"，agent 真的触发 verilator |
| G5 | bb-server 进程由 agent 管理生命周期，崩溃可重启 | agent 启动时 spawn bb-server；agent 退出时 graceful SIGTERM |

### 1.2 非目标（这一版不做）

- ❌ GUI ↔ Agent 的 iframe 集成（[`INTEGRATION.md` §4.2 档位 2](../INTEGRATION.md)）——那是 M5 的事，本设计只让 bbos/agent 自己完整可用。
- ❌ bb-server 的 Tauri sidecar 集成（属于 bbos/gui 范畴）。
- ❌ 多窗口、多 workspace（feature-inventory §5 已标"no multi-window"）。
- ❌ 协议 crate `bbos/protocol/`（M3）——本设计允许 TS 端先有独立类型，后续从 JSON Schema 同步给 Rust。

---

## 2. 架构总览

### 2.1 三层拓扑

```
┌──────────────────────────────────────────────────────────────────────┐
│  bbos/agent (Electron)                                               │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │
│  │ Renderer        │  │ Main Process     │  │ Sidecar             │  │
│  │ (React)         │  │ (Node)           │  │                     │  │
│  │                 │  │                  │  │                     │  │
│  │ EDAPage         │◀─│ tRPC IPC         │  │                     │  │
│  │  ├ Sidebar      │  │  ├ bbRouter ◀────┼──┼──► bb-server (Rust) │  │
│  │  ├ Editor       │  │  ├ edaRouter     │  │     127.0.0.1:P     │  │
│  │  ├ RunPanel ◀───┼──│  └ chatRouter    │  │        │            │  │
│  │  │   Terminal ◀─┼──│       │          │  │        ▼            │  │
│  │  └ RightPanel ──┼──│       ▼          │  │     bbdev (bash)    │  │
│  │                 │  │  EDA Tools       │  │        │            │  │
│  │                 │  │  ├ eda_run_sim   │  │        ▼            │  │
│  │                 │  │  ├ eda_list_chip │  │     verilator /     │  │
│  │                 │  │  └ eda_get_job   │  │     spike / nix     │  │
│  └─────────────────┘  └──────────────────┘  └─────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**关键边界**：

- `bb-server` **不**感知 LLM，**不**感知 EDA，只是个 bbdev 网关 + SSE 广播。
- EDA Tools 是 **Agent 的 builtin tools**（`src/main/agent/tools/builtins/`），LLM 通过工具调用触达 bb-server。模型永远不直接 fetch localhost。
- Renderer 通过 tRPC 拉数据、订阅 SSE；不直接 fetch bb-server，**端口发现由 main process 持有**。

### 2.2 进程生命周期

| 事件 | bb-server | bbos/agent |
|---|---|---|
| agent 启动 (`whenReady`) | spawn (`bridge.ts:startBbServer`) | — |
| agent 启动失败 bb-server | log 警告，照常进 chat（agent 不强制依赖 bb-server） | 优雅降级 |
| 用户首次进入 `/eda` | （已在跑） | `bbRouter.health()` 探测，失败则提示 "BB-Server offline" |
| agent 退出 (`will-quit`) | SIGTERM（`stopBbServer`） | exit |
| bb-server 中途崩溃 | — | `bridge.ts` 每 30s `bbHealthCheck`，连续 3 次失败 → 重启 |

---

## 3. bb-server 端：补 Worker Pool

> 这是 [`bbos/design/backend/spec.md`](./backend/spec.md) §6 的未完工部分。这一节是"补完规格"，不是新设计。

### 3.1 当前缺口

`bbos/backend/README.md` 自承：
- [ ] Worker pool 实际运行 bbdev
- [ ] Tauri sidecar 集成
- [ ] 集成测试（fake bbdev fixture）

### 3.2 本设计要补的第一项（最小可用）

**Worker pool + bbdev 实际执行**：

```
bb-server
├── POST /api/jobs            → 入队 → 立刻返回 { jobId }
├──  tokio task pool (N=4)    → 取出 job → spawn bbdev subprocess
├──  stdout/stderr 管道        → 行解析 → 写日志文件 + 推 SSE
└──  GET  /api/jobs/:id/logs  → SSE 订阅该 job 的历史 + live tail
```

### 3.3 行为契约（要写到 spec.md §6 里）

| 端点 | 请求 | 响应 |
|---|---|---|
| `POST /api/jobs` | `{ kind: "verilator" \| "workload-build" \| "uvm", chip: string, binary?: string, args?: string[] }` | `201 { jobId, status: "queued" }` |
| `GET  /api/jobs` | — | `[JobSummary]` |
| `GET  /api/jobs/:id` | — | `JobState` |
| `GET  /api/jobs/:id/logs` | — | **SSE**（`event: log` / `event: state` / `event: exit`） |
| `POST /api/jobs/:id/cancel` | — | `200 { ok }` 或 `409 { reason }` |

**日志行协议**（SSE frame）：

```
event: log
data: {"ts":1737120000123,"stream":"stdout","line":"[Progress: 25%] ..."}

event: state
data: {"jobId":"j_42","status":"running","exitCode":null}

event: exit
data: {"jobId":"j_42","status":"success","exitCode":0,"durationMs":12345}
```

**进程模型**：
- worker = `tokio::process::Command::new("bbdev")` + 子命令 arg 列表，**不通过 shell**，避免引号注入（见 `INTEGRATION.md §7`）。
- `cancel` 发 SIGTERM；5s 没死发 SIGKILL。
- 日志**同时**写 `userData/jobs/<jobId>.log`（落盘）和推 SSE（实时）。
- worker pool 容量 4，job 多于 4 时排队，状态 `queued`。

---

## 4. bbos/agent 端：三层新增

### 4.1 新增模块清单

```
bbos/agent/src/
├── main/
│   ├── bb/
│   │   ├── bridge.ts            (已有 —— 扩展)
│   │   ├── lifecycle.ts         (新增 —— 健康探测 + 自动重启)
│   │   └── stream.ts            (新增 —— SSE 订阅的轻量 EventSource 封装)
│   ├── api/trpc/routers/
│   │   └── bb.ts                (新增 —— bb-server HTTP 代理给 Renderer)
│   └── agent/tools/builtins/
│       ├── eda-list-chips.ts    (新增)
│       ├── eda-list-binaries.ts (新增)
│       ├── eda-run-simulation.ts(新增)
│       ├── eda-get-job.ts       (新增)
│       └── eda-cancel-job.ts    (新增)
└── renderer/src/
    ├── components/gui/
    │   ├── RunPanel.tsx         (新增 —— chip/simulator/binary 三选 + Run)
    │   ├── TerminalPanel.tsx    (新增 —— xterm.js 流式日志)
    │   └── eda-context.ts       (新增 —— 当前 active file 的 contextRef 注入)
    └── lib/trpc.ts              (扩展 —— 加 bb router)
```

### 4.2 bb bridge 扩展（`bb/bridge.ts`）

**已有**：`startBbServer` / `stopBbServer` / `bbHealthCheck` / `listProjects` / `getWorkspace` / `listJobs` / `getJob` / `buildWorkspaceNote`。

**新增**：

```ts
// bbos/agent/src/main/bb/stream.ts

/**
 * 订阅 bb-server 的 job 日志 SSE。
 * - 重连：断线自动重试 3 次，指数退避 500ms / 1s / 2s
 * - 取消：返回的 unsubscribe() 同时取消 SSE 和丢弃未发送帧
 * - 去重：seq 号乱序到达时丢旧不丢新
 */
export function streamJobLogs(
  jobId: string,
  onLog: (line: { ts: number; stream: 'stdout' | 'stderr'; line: string }) => void,
  onState: (s: JobState) => void,
  onExit: (e: { status: JobStatus; exitCode: number | null; durationMs: number }) => void,
): () => void;
```

实现要点：
- 用 Node 内置 `fetch` + `ReadableStream`，**不引第三方 SSE 库**。
- 通过 `webContents.send('bb:job-log', ...)` 推到 Renderer（与 `eda:fs-event` 同一通道模式）。
- Renderer 端用 `window.bb.onJobLog(...)`（preload 暴露）。

```ts
// bbos/agent/src/main/bb/lifecycle.ts

export function startBbLifecycle(binaryPath: string): void;
export function stopBbLifecycle(): void;
```

- 内部 30s 一次 `bbHealthCheck`；连续 3 次失败 → `startBbServer` 重启。
- 失败时通过 `webContents.send('bb:health', { ok: false, reason })` 推一条事件，让 UI 显示降级提示（不必弹窗）。

### 4.3 新 tRPC 路由器 `bb.ts`

```ts
// bbos/agent/src/main/api/trpc/routers/bb.ts

import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import * as bb from '@main/bb/bridge';
import { streamJobLogs } from '@main/bb/stream';

const jobKind = z.enum(['verilator', 'workload-build', 'uvm']);

export const bbRouter = router({
  /** 健康状态,Renderer 进入 /eda 时探测一次 */
  health: publicProcedure.query(async () => {
    const ok = await bb.bbHealthCheck();
    return { ok, port: bb.getBbServerPort() };
  }),

  /** 列出 workspace 下的 chip */
  listProjects: publicProcedure
    .input(z.object({ root: z.string().min(1) }))
    .query(({ input }) => bb.listProjects(input.root)),

  /** 读 chip + designs 配置 */
  getWorkspace: publicProcedure
    .input(z.object({ root: z.string().min(1), chip: z.string().min(1) }))
    .query(({ input }) => bb.getWorkspace(input.root, input.chip)),

  /** 列出所有 job（EdaPage 顶部 status bar 用） */
  listJobs: publicProcedure.query(() => bb.listJobs()),

  /** 单 job 状态 */
  getJob: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(({ input }) => bb.getJob(input.id)),

  /** 启动 job */
  runJob: publicProcedure
    .input(z.object({
      kind: jobKind,
      chip: z.string().min(1),
      binary: z.string().optional(),
      args: z.array(z.string()).optional(),
    }))
    .mutation(({ input }) => bb.runJob(input)),

  /** 取消 job */
  cancelJob: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(({ input }) => bb.cancelJob(input.id)),

  /** 订阅 job 日志（SSE 风格的 tRPC subscription） */
  streamJobLogs: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .subscription(({ input }) => observable<JobLogEvent>((emit) => {
      const off = streamJobLogs(input.id, /*...*/);
      return off;
    })),
});
```

**职责切分**：
- `bb.ts`（tRPC）= Renderer ↔ main process 的 IPC 边界
- `bb/bridge.ts` = main process ↔ bb-server 的 HTTP 边界
- `bb/stream.ts` = SSE 客户端（独立于 tRPC，方便 EDA tools 复用）

### 4.4 EDA 专属 Agent Tools（LLM 能调的）

放在 `src/main/agent/tools/builtins/eda-*.ts`，每个文件一个 `defineTool(...)`：

```ts
// eda-run-simulation.ts
defineTool({
  name: 'eda_run_simulation',
  description: 'Kick off a Verilator / workload / UVM simulation job. Returns a jobId for tracking.',
  input: Type.Object({
    chip: Type.String({ description: 'Chip name, e.g. "toy"' }),
    binary: Type.Optional(Type.String({ description: 'Baremetal binary, e.g. "toy-toy-vecunit_matmul_ones-baremetal"' })),
    kind: Type.Union([Type.Literal('verilator'), Type.Literal('workload-build'), Type.Literal('uvm')]),
    args: Type.Optional(Type.Array(Type.String())),
  }),
  execute: async (_id, { chip, binary, kind, args }, _ctx) => {
    const { jobId } = await bb.runJob({ kind, chip, binary, args });
    return textResult(`Started job ${jobId}. Use eda_get_job(${jobId}) to poll.`);
  },
});

// eda-get-job.ts
defineTool({
  name: 'eda_get_job',
  description: 'Get current status and (last 100 lines of) logs of a job.',
  input: Type.Object({ jobId: Type.String() }),
  execute: async (_id, { jobId }) => {
    const state = await bb.getJob(jobId);
    const tail = await bb.tailJobLog(jobId, 100);
    return textResult(formatJob(state, tail));
  },
});

// eda-cancel-job.ts
defineTool({
  name: 'eda_cancel_job',
  description: 'Cancel a running job. Idempotent.',
  input: Type.Object({ jobId: Type.String() }),
  execute: async (_id, { jobId }) => {
    const res = await bb.cancelJob(jobId);
    return textResult(res.ok ? `Cancelled ${jobId}.` : `Could not cancel: ${res.reason}`);
  },
});

// eda-list-chips.ts / eda-list-binaries.ts —— 简单包装 bb.listProjects / bb.listBinaries
```

**注入上下文**：
- 系统提示词里 `buildWorkspaceNote` 已有 `Current chip: …` 和 `Running jobs: …` 列表。
- 工具描述里写明「若用户没指定 chip，请先调 `eda_list_chips` + 问用户」——避免 LLM 凭空猜。

**权限**：`eda_run_simulation` 走 permission gate，**default 模式弹卡**让用户确认，**auto-review 模式**直接放行（沙箱行为可预测）。

### 4.5 EDA 页面：RunPanel + TerminalPanel + 真 Agent Tab

#### 4.5.1 布局调整

```
┌──────────────────────────────────────────────────────────────┐
│  TopBar  (← Home / EDA Workbench / Save / ▶ Run / ⚙)         │
├────────────┬──────────────────────────────┬─────────────────┤
│ Sidebar    │ Tabs + Editor                │ Right Panel     │
│ (文件树)   │                              │ ┌──Workspace────┤│
│            │                              │ │ chip / tiles  ││
│            │                              │ ├───────────────┤│
│            │                              │ │Agent (真 chat)││
│            ├──────────────────────────────┤ │              ││
│            │ Terminal (高度可拖拽)         │ │              ││
│            │  ▶ toy matmul ─── running     │ │              ││
│            │  [stdout] [Progress: 25%] …  │ │              ││
│            │  [stderr] Warning: …         │ │              ││
│            │  [Stop]                      │ └──────────────┘│
└────────────┴──────────────────────────────┴─────────────────┘
```

- Terminal 默认折叠、高度 200px、顶部有一个可拖拽的 resize handle（沿用 EDA Page 已有的 drag-to-resize 模式）。
- 跑 job 时自动展开，job exit 后 30s 不动 → 折叠。
- 多个 job 同时跑 → Terminal 顶部一个 chip-like tab 切换（"toy matmul" / "gemmini relu"）。

#### 4.5.2 RunPanel 选型数据来源

- **chip 下拉**：`bb.listProjects(root)` 返回的 chip 列表。
- **simulator 下拉**：写死 `[Verilator, BEMU, FireSim, P2E]`（bb-server 端的 kind 枚举）。
- **binary 下拉**：调 `bb-server /api/projects/<chip>/binaries` —— 这个端点**目前不存在**，本设计要补：扫 `examples/chips/<chip>/binaries/` + `buckyball/bb-tests/workloads/<chip>/*.bin` 拼成列表。

#### 4.5.3 RightPanel "Agent" tab 改造

把现在的 `EDARightPanel.tsx` 里的 mock state 全删，换成真 chat：

```tsx
function AgentTab({ activeFile }: { activeFile: OpenFile | null }) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const { data: thread } = trpc.threads.get.useQuery(
    { id: threadId! },
    { enabled: Boolean(threadId) },
  );

  // 用户首次进入该 tab → 创建（或复用）一个 EDA 专属 thread
  useEffect(() => {
    trpc.threads.create.mutate({
      title: `EDA: ${activeFile?.name ?? 'workspace'}`,
      projectId: ???, // TODO: chipId 是哪个？见 §10 开放问题
    }).then(({ id }) => setThreadId(id));
  }, []);

  // 切文件 → attachFile 把内容塞上下文
  useEffect(() => {
    if (!activeFile || !threadId) return;
    trpc.chat.attachFile.mutate({
      threadId,
      path: activeFile.path,
      content: activeFile.draft ?? cachedContent,
    });
  }, [activeFile?.path]);

  return <ChatView threadId={threadId} />;
}
```

要点：
- 复用现有 `chatRouter` 的 `send` / `events` / `rejoin`。
- 上下文通过新的 `chat.attachFile` mutation 注入（这个 mutation 已经在 spec 里规划但没实现 —— 见 [`feature-inventory.md`](../agent/docs/feature-inventory.md) §4 提到的 "attachFile" payload）。
- workspace / chips 信息走 `buildWorkspaceNote` 已经在 system prompt 里。

---

## 5. 类型契约

下面这些类型写在 `src/shared/bb.ts`，bb.ts router、EDA tools、EDA RunPanel 共享。

```ts
// bbos/agent/src/shared/bb.ts

export type JobKind = 'verilator' | 'workload-build' | 'uvm';
export type JobStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled';

export interface JobSummary {
  id: string;
  kind: JobKind;
  chip: string;
  binary?: string;
  status: JobStatus;
  createdAt: string;       // ISO
  finishedAt?: string;
  returnCode?: number;
}

export interface JobState extends JobSummary {
  command: string[];       // 实际传给 bbdev 的 argv
  logOffset: number;       // 已读 SSE 行数,rejoin 时 from= 这个
}

export interface JobLogEvent {
  type: 'log' | 'state' | 'exit';
  jobId: string;
  ts?: number;
  stream?: 'stdout' | 'stderr';
  line?: string;
  state?: JobState;
  exit?: { status: JobStatus; exitCode: number | null; durationMs: number };
}

export interface RunJobInput {
  kind: JobKind;
  chip: string;
  binary?: string;
  args?: string[];
}

export interface WorkspaceInfo {
  chip: string;
  root: string;
  designs: string[];
  cores: string[];
}
```

---

## 6. 数据流：用户点 Run 之后发生了什么

```
User clicks [▶ Run] in RunPanel
  │
  ▼
EDAPage.handleRun()                    (renderer)
  │  trpc.bb.runJob.mutate({ kind, chip, binary })
  ▼
bbRouter.runJob                        (main, tRPC)
  │  bridge.runJob(input)              (main → bb-server HTTP POST /api/jobs)
  ▼
bb-server: 201 { jobId }              → 返 Renderer
  │
  ▼
EDAPage 自动订阅 trpc.bb.streamJobLogs({ id: jobId })
  │
  ▼
bbRouter.streamJobLogs                 (tRPC subscription)
  │  stream.ts.streamJobLogs(jobId, onLog, onState, onExit)
  ▼
bb-server: GET /api/jobs/:id/logs      (SSE)
  │
  ▼
每条 SSE 帧:
  - onLog   → webContents.send('bb:job-log', line)  →  TerminalPanel 追加一行
              onState → 更新顶部 status badge (queued/running/success/...)
              onExit  → Terminal 标灰、status 终态、Toast「job done」
```

失败路径：

- bb-server 不在 → `trpc.bb.health()` 失败 → RunPanel 灰显 + tooltip "BB-Server offline — restart agent"
- bb-server 返回 4xx → `runJob` mutation 抛 TRPCError → RunPanel 显示红色 banner
- bb-server 推 SSE 断流 → `stream.ts` 重试 3 次（500ms / 1s / 2s）→ 还失败 → Terminal 顶部显示 "Reconnecting…" → 还失败 → 标记 job 状态 `unknown`，让用户手动 `eda_get_job`

---

## 7. 文件结构总结

新增：

```
bbos/agent/src/
├── main/
│   ├── bb/
│   │   ├── lifecycle.ts          # 健康探测 + 自动重启
│   │   └── stream.ts             # SSE 订阅
│   ├── api/trpc/routers/
│   │   └── bb.ts                 # Renderer ↔ bb-server 桥
│   └── agent/tools/builtins/
│       ├── eda-list-chips.ts
│       ├── eda-list-binaries.ts
│       ├── eda-run-simulation.ts
│       ├── eda-get-job.ts
│       └── eda-cancel-job.ts
├── renderer/src/
│   ├── components/gui/
│   │   ├── RunPanel.tsx
│   │   ├── TerminalPanel.tsx
│   │   └── eda-context.ts        # active file → chat context
│   └── lib/trpc.ts               # + bb router
└── shared/
    └── bb.ts                     # 共享类型

bbos/backend/crates/bb-server/src/
├── jobs/
│   ├── pool.rs                   # tokio task pool,新增
│   ├── runner.rs                 # bbdev subprocess,新增
│   └── log_tail.rs               # 文件 tail,新增
└── api/
    └── jobs.rs                   # 已有 endpoint,接 runner

bbos/backend/crates/bb-bbdev/src/
├── lib.rs                        # 已有;新增 cmd 列表 / binary scan
```

修改：

```
bbos/agent/src/main/index.ts                    # + lifecycle 启动/停止
bbos/agent/src/main/bb/bridge.ts                # + runJob/cancelJob/tailJobLog/listBinaries
bbos/agent/src/main/api/trpc/router.ts          # + bbRouter
bbos/agent/src/renderer/src/components/gui/EDAPage.tsx  # + RunPanel + Terminal + 真 Agent tab
bbos/agent/electron-builder.yml                 # extraResources: ["resources/bin/bb-server*"]
bbos/agent/package.json                         # postinstall: 编译 bb-server
bbos/agent/scripts/build-bb-server.sh           # 新增
```

---

## 8. 实施步骤（按依赖排序）

每一步收口条件 = `bun run check && bun test` 通过 + 该步的 E2E 脚本绿。

| 步 | 内容 | 验证 |
|---|---|---|
| **1** | `bridge.ts` 加 `runJob` / `cancelJob` / `tailJobLog` / `listBinaries` 四个 wrapper | 单测：mock fetch，断言请求体正确 |
| **2** | bb-server `bb-server/crates/bb-server/src/jobs/{pool,runner,log_tail}.rs` | cargo test 通过；用 fake bbdev fixture 跑端到端 |
| **3** | bb-server `GET /api/projects/:chip/binaries` | curl 拿到 binary 列表 |
| **4** | agent `bb/stream.ts` + `bb/lifecycle.ts` | 单测 + 手动启 agent 看 console 健康日志 |
| **5** | agent `api/trpc/routers/bb.ts` | tRPC 调用通过；`bun run check` 通过 |
| **6** | agent `tools/builtins/eda-*.ts`（5 个） | bun test + 端到端：模型能正常调用并看到 bb-server job |
| **7** | agent `RunPanel.tsx` + `TerminalPanel.tsx` 接进 `EDAPage.tsx` | 手动：选 chip → 点 Run → Terminal 出日志 → Stop 生效 |
| **8** | EDARightPanel Agent tab 改造（真 chat） | 手动：切文件 → 输入"这个字段啥意思" → 模型答出 |
| **9** | `electron-builder.yml` + `scripts/build-bb-server.sh` | `bun run build:win` 产物里 `resources/bin/bb-server.exe` 存在 |
| **10** | bb-server `cargo build --release` 集成进 `postinstall` | 全新 clone → `bun install` → bb-server 已就绪 |

完成 1–7 = MVP；8 = P0 闭环；9–10 = 可分发包。

---

## 9. 测试策略

### 9.1 单元测试

- `bridge.ts`：用 `vi.fn()` 替换 fetch，断言 4 个 wrapper 的请求 path / body / 错误码。
- `stream.ts`：用 fake SSE server（`node:net` 起一个）发几行后断流，断言 reconnect 行为。
- EDA tools：mock bb-server response，断言 tool result 文本格式。

### 9.2 端到端（fake bbdev）

在 `bbos/backend/crates/bb-server/tests/` 下加：

```rust
// fake_bbdev.rs
#[tokio::test]
async fn run_job_streams_logs() {
    // 1. 启 bb-server,端口 0
    // 2. POST /api/jobs { kind: verilator, chip: toy }
    // 3. GET /api/jobs/:id/logs → 拿 SSE
    // 4. 收到 stdout/stderr 多行 + 最终 exit event
}
```

`fake_bbdev` = 一个 Rust 二进制，接受 `[--emit-stdout=N] [--exit-code=N]` 参数，按节奏往 stdout 吐行，最终退出。

### 9.3 E2E（Playwright + Electron）

`bbos/agent/e2e/` 下加：

- `eda-run-job.spec.ts`：启动 agent dev mode，打开 `/eda`，选 chip → Run → Terminal 出现 `[Progress: 100%]` → 状态变 success。
- `eda-ask-agent.spec.ts`：选中 `chip-top.toml` → Agent tab → 输入"nTiles 字段含义" → 收到包含"tile"字眼的回复。

---

## 10. 开放问题（评审时定）

| # | 问题 | 倾向 |
|---|---|---|
| Q1 | `threads.create` 需要 `projectId`，但 EDA 的"项目"是 `chip` 还是 `workspace root`？ | **workspace root** —— 一个 root 下多个 chip，但 thread 复用同一份上下文 |
| Q2 | `binary` 列表扫描要不要忽略 `examples/`？ | 默认**包含** `bb-tests/workloads/` 和 `examples/chips/<chip>/`，用户后续能自己加路径 |
| Q3 | Terminal 多 job 切换——按时间倒序还是按用户点击顺序？ | **时间倒序** + 用户可钉选 |
| Q4 | bb-server 跨平台路径：`bb-server.exe` 还是统一 `bb-server`？ | 沿用 `bridge.ts` 现有的 `.exe` 判断 |
| Q5 | `system prompt` 里 `buildWorkspaceNote` 当前用 `listJobs` 阻塞——> 1s 超时是否够？ | 改 **5s** + 失败返回 `'bb-server unavailable'`，agent 自己降级 |
| Q6 | EDA 的"运行"是不是要进 permission gate？ | `eda_run_simulation` 必须 gate（破坏性）；`eda_list_*` / `eda_get_job` 不 gate |

---

## 11. 风险与对策

| 风险 | 概率 | 影响 | 对策 |
|---|---|---|---|
| bb-server worker pool 性能差，多 job 跑卡 | 中 | 高 | 容量 4，可调；超载返回 429 + Retry-After |
| SSE 在 Windows 下偶发断流 | 中 | 中 | `stream.ts` reconnect 已经覆盖；Terminal 顶部 banner 提示 |
| bb-server 二进制分发到 Electron 资源里被杀毒误报 | 低 | 高 | electron-builder 加 `signtool`；发布说明里附 SHA256 |
| LLM 误调 `eda_run_simulation` 跑错 chip | 中 | 中 | 工具描述里写明「先 `eda_list_chips`」，permission 默认弹卡 |
| `examples/eda-demo/` 的 VCD 解析阻塞主线程 | 低 | 低 | VCD > 1MB 时切到 worker thread（这一版不做，先 threshold 报警） |

---

## 12. 相关文档 / 锚点

- [`bbos/INTEGRATION.md`](../INTEGRATION.md) — 三方契约总览
- [`bbos/design/backend/spec.md`](./backend/spec.md) — bb-server 完整规格（要补 §6 引用本文 §3）
- [`bbos/backend/README.md`](../backend/README.md) — bb-server 当前实现状态（worker pool 待补）
- [`bbos/agent/CLAUDE.md`](../agent/CLAUDE.md) — 工程约束（Vercel AI SDK、目录组织）
- [`bbos/agent/docs/feature-inventory.md`](../agent/docs/feature-inventory.md) — Agent 全部能力清单
- [`bbos/agent/src/main/bb/bridge.ts`](../agent/src/main/bb/bridge.ts) — 已有 bridge,本设计在此基础上扩展

---

## 变更记录

| 日期 | 变更 | 作者 |
|---|---|---|
| 2026-09-29 | 初稿：bb-server ↔ agent ↔ EDA 三层集成,附实施步骤与开放问题 | — |
