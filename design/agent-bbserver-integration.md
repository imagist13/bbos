# BB-Agent ↔ bbdev 集成设计 (v2)

> 范围：`bbos/agent` 调 `bbdev` 的全部路径。
> 上一版的 Rust HTTP 中间层 (`bbos/backend` / `bb-server`) **已被退役**——`bbdev/mcp` 是 agent 唯一的 DSA 网关。
> 上一次编辑：2026-09-29（v2，退役 bb-server 后重写）。

---

## 0. TL;DR

```
┌────────────────────────────────────────────────────────────┐
│ BB-Agent  (Electron)                                      │
│                                                            │
│  Main Process                                              │
│   ├─ MCP manager   (stdIO client,复用现有基础设施)         │
│   │     └─► buckyball-dev (bbdev/mcp)                     │
│   │           ├─ 44 个现有 tool                            │
│   │           ├─ list_chips      ← 新增                   │
│   │           ├─ list_binaries   ← 新增                   │
│   │           └─ stream_logs     ← 新增                   │
│   ├─ chatRouter  (LLM ↔ mcp tools 自动发现)                │
│   └─ edaMcpRouter (tRPC,转给 renderer 直接用)             │
│                                                            │
│  Renderer                                                  │
│   └─ EDAPage                                              │
│       ├─ FileTree, Editor                                  │
│       ├─ RunPanel   → edaMcpRouter 调 MCP                  │
│       └─ Terminal   → edaMcpRouter.stream_logs(轮询)      │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼ stdIO
                ┌──────────────────────────┐
                │ bbdev/mcp (Python)       │
                │  ├─ common._ensure()     │
                │  │   lazy spawn bbdev    │
                │  │   /Motia HTTP         │
                │  └─ 44 + 3 tools        │
                └──────────┬───────────────┘
                           │
                           ▼ nix develop --command bbdev
                      bbdev (Motia)
                      verilator / firesim / uvm / dc / ...
```

**砍掉的复杂度**：

- ❌ `bbos/backend/` Rust workspace（4 个 crate，~600 行 Rust）
- ❌ `bbos/agent/src/main/bb/{bridge,stream,lifecycle,jobs}.ts`
- ❌ `bbos/agent/src/main/api/trpc/routers/bb.ts`
- ❌ `bb-server.exe` sidecar 二进制（electron-builder 不再打）
- ❌ SSE 日志流（用 MCP 轮询替代）
- ❌ bb-server 的 tokio worker pool（bbdev/mcp 自管）

**新增的复杂度**：

- ✅ `bbdev/mcp/tools/` 加 3 个 tool（~150 行 Python）
- ✅ `bbos/agent/src/main/api/trpc/routers/eda-mcp.ts`（~120 行 TS，渲染层 ↔ MCP 的窄通道）
- ✅ `EDAPage` 改调 tRPC → MCP tool（不再经 bb-server）

---

## 1. 目标与非目标

### 1.1 目标

- **单一 DSA 网关**：所有 bbdev 工具调用走 `bbdev/mcp` 一个出口。
- **零 Rust**：bbos 仓库不再包含 Rust crate；不再需要 cross-compile。
- **LLM-native**：MCP tool 描述即 agent 工具名册，LLM 自动发现、自动选用。
- **GUI 可预测**：EDA Page 的"▶ Run"按钮直接调 MCP tool，行为确定、可取消、可观察。
- **流式日志可见**：用户能在 Terminal 面板看到 bbdev 跑动的 stderr。

### 1.2 非目标

- **不做端云分离**：本期不引入 BB-Cloud，EDA Page 本地直连 bbdev/mcp。
- **不做多 workspace 并行**：v2 只支持单 workspace 上下文；多 workspace 留给 v3。
- **不重写 bbdev**：bbdev 自身是独立 Rust/Python 项目，BBOS 不动它的 API 表面。
- **不替代 Nix**：`nix develop --command bbdev` 仍是用户机器的隐含前提；BBOS 不打包 nix。

---

## 2. 架构

### 2.1 进程拓扑

| 进程 | 职责 | 启动方 |
|---|---|---|
| `BB-Agent`（Electron 主进程）| mcpManager、tRPC、chatRouter、生命周期 | 用户启动 BB-Agent |
| `bbdev/mcp`（Python）| MCP server，`common._ensure()` lazy spawn bbdev | mcpManager 启动 stdIO |
| `bbdev`（Motia HTTP server）| 真正跑 verilator/firesim/uvm | bbdev/mcp lazy 启动 |

**关键点**：`bbdev/mcp` 是**按需启动**的（lazy）。第一个 tool 调用才 `nix develop --command bbdev start --server` 拉起来，最长等 120s。后续调用复用同一进程。BB-Agent 不需要单独再启任何东西。

### 2.2 调用路径

#### 路径 ①：用户在 EDA Page 点 "▶ Run"

```
EDAPage.RunPanel
   │  onClick (electron renderer)
   ▼
edaMcpRouter.runSimulation(chip, binary, kind)
   │  tRPC over IPC (BB-Agent internal)
   ▼
mcpManager.callTool('buckyball-dev', 'bbdev_verilator_run', { chip, binary })
   │  stdIO message
   ▼
bbdev/mcp  tools/verilator_run.py:bbdev_verilator_run
   │  common.submit('/verilator/run', params)
   ▼
bbdev HTTP server  POST /verilator/run  → 返 trace_id
   │
   ▼ (异步,数秒-数分钟)
bbdev/server.log 写入运行结果
state_store.db/<trace_id>.bin 写入最终结果
```

UI 在拿到 trace_id 后，进入 **轮询模式**：

```
EDAPage.RunPanel (mount)
   │
   ▼ setInterval(1000)
edaMcpRouter.streamLogs(traceId, since)
   │
   ▼
mcpManager.callTool('buckyball-dev', 'bbdev_stream_logs', { trace_id, since_line })
   │
   ▼
bbdev/mcp  tools/stream_logs.py:bbdev_stream_logs (本期新增)
   │
   ▼ 读 bbdev/server.log,过滤 [trace_id] 前缀
   │
   ▼ 返回从 since_line 之后的新行
```

#### 路径 ②：用户在 chat 里说"跑个 toy"

```
chat.send(userMessage)
   │
   ▼ LLM
LLM 看到 bbdev/mcp 注册的 44 + 3 个 tool
   │
   ▼ tool_use
mcpManager.callTool('buckyball-dev', 'bbdev_verilator_run', {...})
   │
   ▼ 同一路径,后续同上
```

LLM 与 GUI **共享同一条工具路径**。这意味着：

- LLM 跑的 Run 也产生 trace_id，UI 可以 attach 同一个 trace 看日志。
- LLM 取消的任务也走 `task_cancel` tool，UI 无差异。
- LLM 的 system prompt **必须包含**：

  > 「bbdev/mcp 提供的工具说明即你的工具列表；如果你想跑仿真，调用 `bbdev_verilator_run` 等 tool；通过 `bbdev_task_status <trace_id>` 轮询；用 `bbdev_stream_logs <trace_id>` 读实时日志。」

### 2.3 生命周期

| 阶段 | 行为 |
|---|---|
| BB-Agent 启动 | `mcpManager.start()` 自动 spawn `bbdev/mcp`（stdIO 启动是立即的，< 1s） |
| 第一次 tool 调用 | `bbdev/mcp` 内 `_ensure()` lazy spawn bbdev + 健康探测（最坏 120s） |
| BB-Agent 退出 | `mcpManager.dispose()` 关 stdIO，bbdev/mcp 的 `atexit` 触发 `_stop()` 杀 bbdev |
| bbdev 进程崩溃 | 下一次 tool 调用触发 `_ensure()` 重启；UI 端 `stream_logs` 返 `restarted` 标记 |

---

## 3. bbdev/mcp 新增工具规格

### 3.1 `bbdev_list_chips`

```python
@mcp.tool()
def bbdev_list_chips(root: str = ".") -> list[dict]:
    """
    Scan a workspace root for all chips.

    Args:
        root: Workspace root path (default = current working directory).

    Returns:
        [{"name": "toy", "path": "/abs/path/to/toy/chip.toml",
          "root": "/abs/path/to/toy", "config": { ... }}, ...]

    Notes:
        - 搜索 <root>/**/chip.toml
        - 返回的 "config" 字段包含 chip.toml 的解析结果
          (顶层 [chip] table,以及 [[target]] 表的简表)
        - 工作区根路径可以是 buckyball/bb-tests 或 examples
    """
```

**调用方**：EDAPage 文件树 mount 时；用户改 workspace 设置时。

### 3.2 `bbdev_list_binaries`

```python
@mcp.tool()
def bbdev_list_binaries(chip: str) -> list[dict]:
    """
    List all baremetal binaries available for a chip.

    Args:
        chip: Chip name (e.g. "toy").

    Returns:
        [{"name": "matmul", "path": "/abs/path/to/matmul.bin",
          "size_bytes": 12345, "kind": "baremetal"}, ...]

    Search paths (priority order):
        1. <workspace_root>/examples/chips/<chip>/binaries/
        2. <workspace_root>/buckyball/bb-tests/workloads/<chip>/
        3. bbdev/api/.cache/<chip>/

    Notes:
        - 只列出 *.bin, *.elf, *.hex
        - size_bytes 取自 os.stat
    """
```

**调用方**：EDAPage.RunPanel 选定 chip 后 mount；EDA Page 的 "binary 下拉"。

### 3.3 `bbdev_stream_logs`

```python
@mcp.tool()
def bbdev_stream_logs(
    trace_id: str,
    since_line: int = 0,
    max_lines: int = 1000,
) -> dict:
    """
    Read new log lines for a trace from bbdev/server.log.

    Args:
        trace_id: The trace_id returned by submit() tools.
        since_line: Cursor; first call passes 0, subsequent calls pass the
                    "next_line" returned by the previous call.
        max_lines: Cap on lines returned per call (default 1000).

    Returns:
        {
          "trace_id": "...",
          "lines": ["line 1", "line 2", ...],
          "next_line": 42,
          "eof": False,        # True when state_store has the terminal result
          "finished": False,   # True when task is done (state != running)
          "result": {...}      # If finished, the final state (mirrors task_status)
        }

    Notes:
        - 读取 bbdev/server.log,过滤含 "[<trace_id>]" 的行
        - server.log 是 nix develop 子进程的合并 stdout/stderr,bbdev 会用
          约定前缀标记 trace_id
        - 若 since_line 超出已读范围,返回 EOF 提示,客户端应降频
        - 1s 轮询节奏:UI 调用方应 setInterval(1000) 即可
    """
```

**调用方**：EDAPage.TerminalPanel；chat 中 LLM 看到 task 进度也可调用。

### 3.4 现有 44 个 tool（无需改动）

`bbdev_task_status(trace_id)` 已经在 `common.py` 里实现了**最终结果**轮询；新 `stream_logs` 补充**过程中日志**轮询。两者结合：

| 场景 | 用哪个 |
|---|---|
| 只想要最终结果 | `task_status` |
| 想要实时 stderr | `stream_logs`（轮询 1s）|
| 同时要两者 | 并发调两个 |

LLM 工具描述里写清这个差异，避免重复调用。

---

## 4. BB-Agent 端改动

### 4.1 `resources/mcp.json`（无改动）

```json
{
  "mcpServers": {
    "buckyball-dev": {
      "command": "python",
      "args": ["-u", "-m", "bbdev.mcp"],
      "cwd": "d:/acode/buckyball",
      "env": {}
    }
  }
}
```

> **注意**：`cwd` 是 dev 默认值。生产环境应该跟随用户 workspace 动态设置——留给 v3，本期写死。

### 4.2 `src/main/api/trpc/routers/eda-mcp.ts`（新增）

渲染层与 MCP 之间的窄通道。**禁止**做 `mcp.call(serverName, toolName, args)` 这种通用透传；必须显式列举允许的 tool 和它们的入参 schema：

```ts
// bbos/agent/src/main/api/trpc/routers/eda-mcp.ts

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { mcpManager } from '../../mcp/manager';

const mcp = (tool: string, args: Record<string, unknown>) =>
  mcpManager.callTool('buckyball-dev', tool, args);

export const edaMcpRouter = router({
  listChips: publicProcedure
    .input(z.object({ root: z.string().optional() }))
    .query(({ input }) => mcp('bbdev_list_chips', { root: input.root ?? '.' })),

  listBinaries: publicProcedure
    .input(z.object({ chip: z.string() }))
    .query(({ input }) => mcp('bbdev_list_binaries', { chip: input.chip })),

  runSimulation: publicProcedure
    .input(z.object({
      chip: z.string(),
      binary: z.string(),
      kind: z.enum(['verilator', 'workload', 'uvm']).default('verilator'),
      coverage: z.boolean().default(false),
      noWave: z.boolean().default(false),
      jobs: z.number().int().optional(),
    }))
    .mutation(({ input }) => mcp('bbdev_verilator_run', {
      chip: input.chip,
      binary: input.binary,
      coverage: input.coverage,
      'no-wave': input.noWave,
      jobs: input.jobs,
    })),

  streamLogs: publicProcedure
    .input(z.object({
      traceId: z.string(),
      sinceLine: z.number().int().default(0),
      maxLines: z.number().int().default(1000),
    }))
    .query(({ input }) => mcp('bbdev_stream_logs', {
      trace_id: input.traceId,
      since_line: input.sinceLine,
      max_lines: input.maxLines,
    })),

  taskStatus: publicProcedure
    .input(z.object({ traceId: z.string() }))
    .query(({ input }) => mcp('bbdev_task_status', { trace_id: input.traceId })),

  taskCancel: publicProcedure
    .input(z.object({ traceId: z.string() }))
    .mutation(({ input }) => mcp('bbdev_task_cancel', { trace_id: input.traceId })),
});
```

### 4.3 `src/shared/settings.ts`（改造）

删除 `workspace.currentChip`：

```diff
- workspace: workspaceShape.default(workspaceShape.parse({})),
+ // workspace shape 整体删除;chip 选择改为运行时调 MCP
```

替代方案：UI 上 chip 选择器直接调 `edaMcpRouter.listBinaries(chip)`，**不再持久化到 settings**。

### 4.4 `src/main/index.ts`（已清理）

上一版删掉了 `startBbServer` / `stopBbServer` 调用。`shutdown()` 函数相应简化：

```ts
async function shutdown() {
  // scheduled, runner, mcp, updater, session-store, db
}
```

### 4.5 System prompt（新增/改造）

`chatRouter` 注入的 system prompt 增加：

```text
## DSA 工具

你通过 `bbdev/mcp` MCP server 调用所有 DSA (Domain-Specific Accelerator) 工具。
当前注册的 server 叫 `buckyball-dev`,44 + 3 个 tool。

关键 tool:
- bbdev_verilator_run (chip, binary, [coverage, no_wave, jobs, ...])
- bbdev_workload_build / bbdev_workload_clean
- bbdev_uvm_build / bbdev_uvm_run
- bbdev_task_status (trace_id) → 最终结果
- bbdev_stream_logs (trace_id, since_line) → 实时 stderr
- bbdev_task_cancel (trace_id) → 取消运行中任务
- bbdev_list_chips (root) → 列出 workspace 里所有 chip
- bbdev_list_binaries (chip) → 列出某个 chip 的 baremetal 二进制

工作流:
1. 用户说"跑 toy 的 matmul":先 bbdev_list_binaries("toy") 确认 matmul.bin 存在
2. 调 bbdev_verilator_run,拿 trace_id
3. 给用户回 trace_id,告诉他"已提交"
4. 用户问进度:调 bbdev_stream_logs 看实时日志;调 bbdev_task_status 看最终结果
5. 任务取消:调 bbdev_task_cancel

如果工具返 success=false,不要重试超过 1 次,直接告诉用户错在哪。
```

---

## 5. EDA Page 改动

### 5.1 RunPanel

`▶ Run` 按钮 → `edaMcpRouter.runSimulation(...)`，**不经过 LLM**。理由：

- 行为可预测（同一份输入同一份输出）
- 启动延迟低（无 LLM round-trip）
- 用户已经知道要跑什么，不需 AI 解释

UI 状态机：

```
idle
  │ click Run
  ▼
submitting (mutation in flight)
  │ done (trace_id 拿到)
  ▼
polling (setInterval 1000 → streamLogs + taskStatus)
  │ finished === true
  ▼
finished (显示 stdout 摘要 + terminal 日志)
  │ click Rerun / new chip
  ▼
idle
```

取消按钮 → `edaMcpRouter.taskCancel(traceId)`。

### 5.2 TerminalPanel

订阅 `streamLogs` 轮询结果，渲染为可滚动只读文本。**不要**用 xterm.js 这种重型组件——just a `<pre>` with auto-scroll。

当 `eof && finished` 时停止轮询，显示"任务完成 - [查看结果]"。

### 5.3 FileTree / Editor

无变化（这部分本来就是本地文件系统操作，不经过 bbdev）。

---

## 6. 错误处理

| 错误源 | 检测 | UI 表现 |
|---|---|---|
| `bbdev/mcp` 启动失败（python not found） | mcpManager 连接失败 | "找不到 python，请安装 Python 3.11+" |
| bbdev 启动失败（nix not found） | `common._ensure()` 抛 `nix not found` | "找不到 nix，请安装 Nix 包管理器" |
| bbdev 健康检查 120s 超时 | `_ensure()` raise | "bbdev 启动超时，请查看日志: bbdev/server.log" |
| 工具调用 4xx/5xx | `_http()` 返错误 | "bbdev 拒绝: <error>" |
| bbdev 进程崩溃 | `_ready()` 返 False | 下次工具调用自动重启,UI 端 stream_logs 短暂中断 |

**日志位置**：`bbdev/server.log`（绝对路径通过 `common.log_path()` 获取，可在 system info 里展示）。

---

## 7. 文件清单

### 7.1 删除（已处理）

```
bbos/backend/                                  # 整个 Rust workspace
bbos/agent/src/main/bb/                        # bridge, lifecycle, jobs, stream
bbos/design/backend/                           # spec.md, dev.md
bbos/design/agent-bbserver-integration.md      # 上一版
```

### 7.2 新增

```
bbdev/mcp/tools/list_chips.py
bbdev/mcp/tools/list_binaries.py
bbdev/mcp/tools/stream_logs.py
bbdev/mcp/tests/test_list_chips.py
bbdev/mcp/tests/test_list_binaries.py
bbdev/mcp/tests/test_stream_logs.py

bbos/agent/src/main/api/trpc/routers/eda-mcp.ts
```

### 7.3 改动

```
bbos/agent/src/shared/settings.ts              # 删除 workspace shape
bbos/agent/src/main/index.ts                   # 已清理
bbos/agent/src/renderer/.../EDAPage/RunPanel.tsx  # 调 edaMcpRouter
bbos/agent/src/renderer/.../EDAPage/Terminal.tsx  # 调 edaMcpRouter.streamLogs
bbos/agent/src/main/chatRouter/systemPrompt.ts     # 增加 DSA 工具章节
bbos/INTEGRATION.md                            # 删 backend 章节
```

### 7.4 不动

```
bbos/agent/resources/mcp.json                  # 已有 buckyball-dev 注册
bbos/agent/electron-builder.yml                # 不再打 bb-server.exe
bbdev/mcp/tools/__init__.py                    # 仅注册新 tool
bbdev/mcp/common.py                            # _ensure 已够用
```

---

## 8. 实施步骤

按顺序，每步可独立验证：

| # | 步骤 | 验证 |
|---|---|---|
| 1 | 加 3 个新 bbdev/mcp tool + 单元测试 | `cd bbdev/mcp && pytest` |
| 2 | 起 bbdev/mcp，`echo 'bbdev_list_chhips()' \| python -m bbdev.mcp` 手动测 | JSON 输出符合预期 |
| 3 | 新增 `eda-mcp.ts` 路由 + 注册到 rootRouter | 启动 BB-Agent，`trpc.edaMcp.listChips.useQuery()` 在 devtools 能返 |
| 4 | 改 EDAPage.RunPanel 调 tRPC | 选中 chip/binary 点 Run，能拿到 trace_id |
| 5 | 改 EDAPage.Terminal 调 streamLogs | terminal 实时刷新 |
| 6 | system prompt 加 DSA 章节 | 在 chat 里说"跑个 toy 的 matmul"，LLM 能找到正确的 tool |
| 7 | 删 `workspace.currentChip` 字段 | settings 重置后不报错 |
| 8 | 更新 INTEGRATION.md | 文档自洽 |

---

## 9. 风险与开放问题

### 9.1 bbdev/mcp 与 nix 的全局耦合

bbdev 必须 `nix develop --command` 才能跑。意味着：

- Windows 用户装 nix 是先决条件（BBOS 已经假设这条，不算新约束）
- macOS 上 nix shell 会显著拖慢首调（实测 ~10s）；后续调用命中缓存可接受

**缓解**：在 BB-Agent 启动时调一次 `bbdev_task_status("nonexistent")` 触发预热，UI 显示 "bbdev 预热中…"。

### 9.2 Python stdIO 的脆弱性

mcpManager 用 stdIO 跟 Python 通信。Python 进程的 stderr 噪音、print 调试都可能污染 stdIO 协议。

**缓解**：bbdev/mcp 的 `common._log()` 已经写 `file=sys.stderr, flush=True`，**协议通道是 stdout**。我们在 BB-Agent 端只解析 stdout 的 JSON-RPC，stderr 直接进 log。但需要验证一些调试 print 没意外写 stdout。

### 9.3 stream_logs 的格式约定

`stream_logs` 依赖 `bbdev/server.log` 行里能找到 `[<trace_id>]` 前缀。bbdev 当前是否真的有这个约定？**需要确认**。如果没，需要：

- 给 bbdev 提 PR，加 trace_id 前缀
- 或者改用 state_store.db 增量轮询（类似 task_status 但带 chunks）

### 9.4 chat 中 LLM 调 MCP 与 GUI 调 MCP 的隔离

LLM 在 chat 里也能调 `bbdev_stream_logs`。如果用户在 chat 里跑任务、GUI 那边又点 Run，**两个 trace_id 不一样**——目前没有 UI 把 chat 里的 trace 接到 RunPanel 里。这是 UX 问题，本期不做。

### 9.5 取消语义

`bbdev_task_cancel` 在 bbdev/mcp 里只标记状态，**真正杀掉子进程**要等 bbdev 自己的 cancel 实现。短期可能只是"软取消"——UI 要明确显示"取消请求已发送"，不是"已终止"。

### 9.6 cwd 写死

`resources/mcp.json` 当前 `cwd: d:/acode/buckyball` 是开发机值。生产环境应该跟用户 workspace 走——这是 BBOS 整体的 workspace 抽象问题，留给 v3。

---

## 10. 与上一版的关键差异

| 维度 | v1 (Rust bb-server) | v2 (纯 MCP) |
|---|---|---|
| 进程数 | 3（agent / bb-server / bbdev）| 2（agent / bbdev/mcp） |
| 语言栈 | TS + Rust + Python + Nix | TS + Python + Nix |
| 端点协议 | HTTP + SSE + tRPC | stdIO MCP + tRPC |
| LLM 工具名册 | 手动维护 wrapper | MCP 自动发现 |
| 取消语义 | bb-server 控进程 | bbdev/mcp 透传到 bbdev |
| 日志流 | SSE（`/api/jobs/:id/logs`）| MCP 轮询（`bbdev_stream_logs`） |
| workspace 扫描 | Rust walk 盘 | Python glob 盘 |
| 二进制分发 | electron-builder extraResources | 不需要打包 bbdev |
| 文档章节 | 8 章 ~647 行 | 10 章 ~本文件 |

---

## 11. 相关文档

- `bbos/design/dev.md` — BBOS 整体设计
- `bbos/INTEGRATION.md` — 系统集成（v2 简版）
- `bbdev/mcp/README.md`（待补）— bbdev/mcp 的工具清单
- `bbdev/api/README.md`（待补）— bbdev HTTP API 表面

---

## 12. 编辑历史

| 日期 | 版本 | 改动 |
|---|---|---|
| 2026-09-28 | v1 | 初稿，bb-server (Rust) + bbdev 双轨 |
| 2026-09-29 | v2 | 退役 bb-server，bbdev/mcp 升为唯一网关 |
