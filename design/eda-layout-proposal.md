# BBOS EDA Layout v0.3 Proposal

**Status**: 方案待评审
**作者**: bb-agent
**关联**: `agent-bbserver-integration.md` (MCP), `dev.md` (Cloud), `ecos-studio/` (参考实现)
**版本**: v0.3 — 2026-09-30

---

## 1. 目标与边界

### 1.1 现状

`EDAPage` 是个**伪 IDE**：文件树 + VS Code tab + Monaco 文本编辑器 + 一个空的右栏。它回答的是"打开哪个 .toml 改"，不是"怎么开发一颗 NPU"。

### 1.2 目标

把 `/eda` 改造成**buckyball NPU 开发工作台**，由四个性质不同的页面组成，复用 `ecos-studio` 的页面语义（不是组件）：

- **配置驱动**：每个页面是 schema-driven 表单，不让用户手写 toml/v 文本
- **AI 在回路**：右栏常驻 EDA chat，跟当前 page + 当前 run 共享 context
- **run 流式化**：每个 run 是一个可观察、可中断、可继续的工作流节点
- **不偏离根**：保留 `pickWorkspace` / `listFiles` / `readFile` / `writeFile` / `startWatching` 这层 tRPC 作为底层；新页面在它们之上封装

### 1.3 不在本期范围

- 删 `FileEditor` / `EDATabsBar`——保留作为"高级模式"入口（隐藏在 Settings → Advanced）
- 替换设计令牌 / Tailwind 配置
- 改 `eda.ts` router 的现有 procedure 签名
- Cloud 模式（Phase 2，本地 Electron 跑得通为先）
- `RegressionPage` / `FireSimPage` / `IpPage` / `P2EPage` / `McpResourcesPage` —— 留 Phase 2

---

## 2. 页面地图

`/eda` 路由保留，但内部换成新的**多页面布局**。新结构是一个**单页 SPA with tab nav**（不是嵌套路由），因为这些页面共享同一个 workspace、同一份 cache、同一套 AI context，嵌套路由反而割裂。

| Page key | Title | 入口位置 | 主要 bbdev 调用 |
|---|---|---|---|
| `home` | Overview | 默认页 | 读 `state_store.db` 最近 runs |
| `sim` | Simulation | 侧栏 | `bbdev_verilator_run` / `bbdev_vcs_run` / `bbdev_vcs_uvm` |
| `synth` | Synthesis | 侧栏 | `bbdev_dc_synth` / `bbdev_yosys_synth` |
| `chat` | AI Assistant | 顶栏 + 右栏开关 | LLM with current spec + run |

### 2.1 顶部导航（替换现有 TopBar）

```
┌────────────────────────────────────────────────────────────────┐
│  ‹ Home   [BB] EDA Workbench   ▸ Overview │ Sim │ Synth │ Chat │
│                                                  [Save] [Lang] │
└────────────────────────────────────────────────────────────────┘
```

顶部 tab 是**水平一排**，不是侧栏图标——因为页面数量只有 4 个，水平更直观，也容易扩展到第三批。底部 `StatusBar` 显示当前 run 状态（IDLE / RUNNING / PASSED / FAILED）。

---

## 3. 组件树（四个页面 + 全局壳）

```
EDAPage (改)
├── EdaTopBar           [新]   水平 tab 切换 + workspace 名 + global actions
├── EdaStatusBar        [新]   当前 run 状态 + terminal toggle
├── EdaContent          [新]   当前 activePage 的容器
│   ├── HomePage        [新]
│   ├── SimPage         [新]
│   ├── SynthPage       [新]
│   └── EdaChatPanel    [新]   也可以独立挂成右侧抽屉（toggle）
├── EdaTerminalDrawer   [新]   底部抽屉，可折叠，对应 ecos-studio 的 ECOSTerminal
└── (legacy IDE shell)  隐藏   保留 FileEditor + Tabs，进 Settings → Advanced 才显示
```

页面之间的状态共享通过一个轻量 zustand store：`useEdaPageStore`，存 `activePage` / `currentRunId` / `chatContext`。

---

## 4. 每个页面的细节

### 4.1 HomePage（默认页）

**目的**：让用户回到 EDA 第一眼就知道**最近干了什么、下一步该干嘛**。

**布局**（单列垂直 scroll）：

```
┌─────────────────────────────────────────┐
│ Workspace: ~/buckyball          [切换]  │
├─────────────────────────────────────────┤
│ Recent Runs                              │
│   ✓  v1.2  verilator  toy      3m ago   │
│   ✗  v1.1  verilator  custom  10m ago   │
│   ✓  v1.0  vcs       toy      1h ago    │
│   (点 run 行 → 跳到 SimPage,加载该 run 配置)│
├─────────────────────────────────────────┤
│ AI Suggestions               [刷新]      │
│   • "上次 run 在 cycle 12 端口冲突,        │
│      建议把 latency 3 改成 4"            │
│   • "你还没跑过 chip=custom 的 regression" │
│   • "ISA 表里 opcode=0x07 未实现"         │
│   (点 suggestion → 在 Chat 里展开)        │
├─────────────────────────────────────────┤
│ Quick Actions                            │
│   [+ New simulation]  [+ Run regression] │
└─────────────────────────────────────────┘
```

**数据源**（仅读，不写）：
- `eda.recentRuns({ workspace, limit: 5 })` — 新 tRPC procedure，查 `state_store.db` 的 `runs` 表
- `eda.aiSuggestions({ workspace })` — 新 procedure，调 LLM，传入 recent runs + current spec summary

**关键决策**：HomePage **不主动调 bbdev**，所有内容都是已有数据的派生。冷启动 < 200ms。

### 4.2 SimPage

**目的**：配置一个 simulation 任务，跑起来，看实时日志，看结果。

**布局**（三段）：

```
┌─────────────────────────────────────────┐
│ Config (left, 320px)    │  Live (right) │
│ ───────────            │  ───────────  │
│ Chip:  [toy    ▼]       │  [▶ Run]      │
│ Backend:               │  Status: IDLE │
│  ◉ verilator           │               │
│  ○ vcs                 │  ── stdout ── │
│ Test:                  │  [streaming]  │
│  ◉ uvm_smoke           │               │
│  ○ custom (.v)         │               │
│ Trace:                 │               │
│  [x] VCD               │               │
│  [ ] FST               │               │
│  [ ] dpi-c             │               │
│ Plus args:             │               │
│  [+number cycles 1000] │               │
│                        │               │
│ [+ Advanced...]        │               │
└────────────────────────────────────────┘
```

**Schema 驱动**：表单字段从 `simConfigSchema.ts` 推导（用 `zod`），**用户永远看不到 toml**。`Advanced` 弹全屏 Dialog（参考 `WorkspaceStepConfigDialog`），里面可以手动覆盖 toml。

**Run 流程**：
1. 用户点 ▶ Run → `eda.runSimulation.mutate({ config })`
2. tRPC server 调 `bbdev_mcp.bbdev_verilator_run(config)`
3. 返回 `{ runId, status: 'running' }`
4. 客户端订阅 `eda.runLog.subscribe({ runId })` —— **tRPC subscription over IPC**，按行流式 stdout/stderr
5. 用户可随时点 [Stop] → `eda.stopRun.mutate({ runId })`

**Live 日志渲染**：
- 不直接用 `<MonacoLogViewer>`（那是个大型组件），用普通 `<pre>` + 自动滚动
- 行号 + 关键字高亮（`error` 红色 / `warning` 黄色 / `pass` 绿色）
- 后续可升级到 Monaco 编辑器

### 4.3 SynthPage

**目的**：跑综合，对比 PPA。

**布局**（类似 SimPage，但右侧是**结果视图**而不是日志）：

```
┌──────────────┬────────────────────────────┐
│ Config       │  Results                    │
│ Backend:     │  ─────────                  │
│ ◉ dc         │  [Run #5]                   │
│ ○ yosys      │  Area: 1.2M gates (-3%)    │
│ Top module:  │  Freq: 250 MHz (-5%)       │
│ [buckyball]  │  Power: 0.8W (+1%)         │
│ Clock:       │  ─────────                  │
│ [100 MHz]    │  [Compare with #4 ▾]       │
│              │  ─────────                  │
│ [▶ Run]      │  [Open report]             │
│              │  [Export signoff pkg]      │
└──────────────┴────────────────────────────┘
```

**数据源**：
- `eda.runSynthesis.mutate(...)` — 调 `bbdev_dc_synth` 或 `bbdev_yosys_synth`
- `eda.runResults.useQuery({ runId })` — 读 reports（area / freq / power）
- `eda.compareRuns({ a, b })` — diff 两份 report

### 4.4 EdaChatPanel

**目的**：让用户用自然语言跟 LLM 协作。**不是** bb-agent 那个全局 chat，是 EDA 专属。

**两种形态**：
1. **嵌入式**：作为 `SimPage` / `SynthPage` 的右侧固定列（默认 width=360px）
2. **抽屉式**：从右侧滑出，用户可手动 toggle（ecos-studio 的 `HomeAgentDrawer` 模式）

**Context 注入**：每次发消息，client 自动附带：
```json
{
  "workspace": "/abs/path/to/buckyball",
  "currentPage": "sim",
  "currentConfig": { "chip": "toy", "backend": "verilator", ... },
  "currentRunId": "run_5f3a",
  "recentRuns": [...],   // 最近 5 条
  "specSummary": { ... } // chip.yaml 的摘要
}
```

**Tools available to chat**（用 MCP / bbdev_mcp 的工具）：
- `read_file`, `write_file` — 已有
- `bbdev_verilator_run` — 触发一次 sim
- `bbdev_get_run_status` — 查 run 状态
- `bbdev_get_waveform` — 拉波形片段
- `bbdev_diff_runs` — 比较两次 run

**实现**：复用 `bbos/agent/src/main/conversation/` 的 runtime，只是 prompt 模板不同 + 工具白名单更窄。

---

## 5. 路由与文件改动

### 5.1 路由

**保持** `/eda` 单路由，**不在 TanStack Router 里嵌套**。原因：
- 跨页面共享 workspace cache、subscription、terminal 输出
- 嵌套路由会导致每次切页面 unmount/remount，丢 streaming run
- ecos-studio 用嵌套路由是因为它的 workspace 是顶级 route；我们 workspace 是 state，不需要

切页面用 `useEdaPageStore(s => s.setActivePage('sim'))`，渲染条件分支即可。

### 5.2 新增/修改文件清单

| 文件 | 动作 | 说明 |
|---|---|---|
| `renderer/src/components/gui/EDAPage.tsx` | **改** | 改成 layout 壳，按 `activePage` 渲染 |
| `renderer/src/components/gui/eda/EdaTopBar.tsx` | 新 | 水平 tab nav + global actions |
| `renderer/src/components/gui/eda/EdaStatusBar.tsx` | 新 | 底部状态栏 |
| `renderer/src/components/gui/eda/EdaTerminalDrawer.tsx` | 新 | 底部 terminal 抽屉（全局） |
| `renderer/src/components/gui/eda/pages/HomePage.tsx` | 新 | Overview |
| `renderer/src/components/gui/eda/pages/SimPage.tsx` | 新 | Simulation |
| `renderer/src/components/gui/eda/pages/SynthPage.tsx` | 新 | Synthesis |
| `renderer/src/components/gui/eda/pages/EdaChatPanel.tsx` | 新 | EDA 专属 chat |
| `renderer/src/components/gui/eda/stores/useEdaPageStore.ts` | 新 | zustand: activePage + chatContext |
| `renderer/src/components/gui/eda/stores/useRunStore.ts` | 新 | zustand: 当前 run + history + subscriptions |
| `renderer/src/components/gui/eda/lib/simConfigSchema.ts` | 新 | zod schema for Sim config |
| `renderer/src/components/gui/eda/lib/synthConfigSchema.ts` | 新 | zod schema for Synth config |
| `renderer/src/components/gui/eda/lib/runStatus.ts` | 新 | enum + helpers |
| `renderer/src/components/gui/EDASidebar.tsx` | **改** | 从文件树改成页面导航（保留 tree 作为隐藏选项） |
| `renderer/src/components/gui/EDARightPanel.tsx` | 删 | 被 `EdaChatPanel` 取代 |
| `renderer/src/components/gui/EDATabsBar.tsx` | 移走 | 移到 `_legacy/`，只在 Advanced 模式用 |
| `renderer/src/components/gui/FileEditor.tsx` | 移走 | 同上 |
| `renderer/src/routes/_app/eda.tsx` | 改 | 默认 tab = 'home' |

### 5.3 tRPC 新增 procedure

新增到 `renderer/src/main/api/trpc/routers/eda.ts`（改文件名 `edaStudio.ts` 也行，先不动）：

```ts
// 已有（保留）
pickWorkspace / listFiles / readFile / writeFile / startWatching / stopWatching
defaultWorkspace / onEdaFsEvent（preload 桥）

// 新增
recentRuns: protectedProcedure
  .input(z.object({ workspace: z.string(), limit: z.number().default(5) }))
  .query(({ input }) => db.runs.findMany({ where: { workspace: input.workspace }, take: input.limit }))

aiSuggestions: protectedProcedure
  .input(z.object({ workspace: z.string() }))
  .query(({ input }) => llm.suggestionsFor(input.workspace))

runSimulation: protectedProcedure
  .input(simConfigSchema)
  .mutation(async ({ input }) => bbdev.runSimulation(input))

runSynthesis: protectedProcedure
  .input(synthConfigSchema)
  .mutation(async ({ input }) => bbdev.runSynthesis(input))

stopRun: protectedProcedure
  .input(z.object({ runId: z.string() }))
  .mutation(({ input }) => bbdev.stop(input.runId))

runLog: protectedProcedure   // subscription
  .input(z.object({ runId: z.string() }))
  .subscription(({ input }) => bbdev.subscribeLogs(input.runId))

runStatus: protectedProcedure
  .input(z.object({ runId: z.string() }))
  .query(({ input }) => bbdev.getStatus(input.runId))

runResults: protectedProcedure
  .input(z.object({ runId: z.string() }))
  .query(({ input }) => bbdev.getResults(input.runId))

compareRuns: protectedProcedure
  .input(z.object({ a: z.string(), b: z.string() }))
  .query(({ input }) => bbdev.compare(input.a, input.b))
```

**订阅通道**：`runLog` 是 tRPC subscription，底层走 `electron-trpc` 的 IPC（已经是 streaming）。如果 `bbdev` 的 log 不是事件流，需要在 server 端包装：`spawn bbdev ... → readline → observable.subscribe(observer)`。

---

## 6. 数据流：一次完整 run

```
[SimPage UI]
   │  user clicks ▶ Run
   ▼
[runSimulation mutation]
   │
   │  via IPC → main process
   ▼
[bbdev_mcp bbdev_verilator_run]
   │  spawn subprocess, get pid
   ▼
[RunStore (zustand)]
   │  currentRunId = run_5f3a
   │  status = 'running'
   ▼
[runLog subscription]  ◄──── bbdev subprocess stdout/stderr
   │                                (line-by-line)
   ▼
[SimPage live log pane]
   │  append <pre> with auto-scroll
   ▼
[on exit]
   │  status → 'passed' | 'failed'
   │  results → state_store.db
   ▼
[HomePage / SimPage]
   refresh recentRuns + show status badge
```

**关键约束**：
- subscription 必须在 IPC 链路里能稳定 streaming。`electron-trpc` 已经支持，但我们要测一下**长 run（10min+）** 下是否会断
- 切页面不能丢 run：subscription 放在 `useRunStore`，生命周期跟 EDA layout 走，不跟单个 Page 走

---

## 7. 与现有设计的关系

- **MCP 集成（`agent-bbserver-integration.md`）**：`runSimulation` / `runSynthesis` / `stopRun` 全部走 MCP stdio 子进程，复用已有 bbdev_mcp server。新增 `runLog` 是新 procedure，server 端需要写一个 line-buffered observable wrapper
- **Cloud 模式（`dev.md` Phase 2）**：tRPC subscription 在 WS 链路下能复用，**只要 Main 里 `electron-trpc` 的 streaming 接口跟 WS handler 一致**。先 Electron 跑通，Cloud 是后话
- **现有 bbdev 调用方式**（`verilator_run.py` 那种 stdio 子进程）：server 端包一层就行，不要改 bbdev 本身

---

## 8. 不做（明确）

- ❌ 替换 design tokens / Tailwind
- ❌ 删 `FileEditor` / `EDATabsBar`（移走，藏在 Advanced）
- ❌ 加注册 / 鉴权（Cloud 再说）
- ❌ `RegressionPage` / `FireSimPage` / `IpPage` / `P2EPage` / `McpResourcesPage`（第二批）
- ❌ waveform viewer（用外部工具打开 .vcd）
- ❌ Monaco log viewer（先用 `<pre>`）
- ❌ 把 bbos/gui 拉进来（Tauri 独立演进）

---

## 9. 实施顺序（5 个 PR）

每个 PR 独立可演示，1-2 天一个。

### PR1: Layout 骨架（**先做这个**）
- `EdaTopBar` + `EdaStatusBar` + `useEdaPageStore`
- 把 `EDAPage` 改成按 `activePage` 条件渲染，目前所有 activePage 都指向一个占位组件显示 "TODO: HomePage"
- 文件树 sidebar 隐藏
- 视觉上确认方向

### PR2: HomePage
- `eda.recentRuns` tRPC procedure（查 state_store.db 或一个最小 JSON 文件）
- `eda.aiSuggestions` stub（先返回硬编码 3 条）
- `HomePage` UI 接上

### PR3: SimPage + run 基础设施
- `eda.runSimulation` / `eda.stopRun` / `eda.runLog` subscription
- `useRunStore`
- `SimPage` 表单 + ▶ Run 按钮 + 实时日志
- 这是**最大的一个 PR**，需要打通端到端

### PR4: SynthPage
- `eda.runSynthesis` / `eda.runResults` / `eda.compareRuns`
- `SynthPage` UI

### PR5: EdaChatPanel
- 复用 conversation runtime，加 EDA 工具白名单
- Context 注入
- 抽屉 + 嵌入式两种形态

---

## 10. 验收标准

每个 PR 完成后能向用户演示：

| PR | 演示什么 |
|---|---|
| 1 | 看到顶部 tab 切换，4 个页面都显示 "TODO"，无崩溃 |
| 2 | 打开 EDA 看到最近 3 条 run + 3 条 AI 建议 |
| 3 | 选 chip=toy + backend=verilator，点 ▶ Run，**实时看到 stdout 一行行出来**，跑完后状态变 passed |
| 4 | 跑一次 synthesis，看 area/freq/power 三个数字 |
| 5 | 在 chat 里说"上次 run 为什么挂了"，AI 调工具拉日志，解释原因 |

---

## 11. 待决问题（实施前要回答）

1. **`runLog` subscription 用 IPC 还是 WS？** 当前 `electron-trpc` 走 IPC 已经能 streaming，建议先用 IPC，等 Cloud 阶段再切 WS。
2. **state_store.db 的 schema 谁来定？** bbdev 侧有 `state_store` 的话直接复用；没有就先放一个 JSON 文件在 workspace 根。
3. **`aiSuggestions` 第一版要不要真调 LLM？** 建议先硬编码 3 条，验证 UI 位置；PR5 一起接 LLM。
4. **terminal drawer 默认折叠还是展开？** 建议**默认折叠 + ESC 唤起**——首次打开不被日志刷屏，但又容易找到。
5. **旧的 `EDASidebar` 文件树去哪？** 建议保留为 "Advanced → File explorer" 入口，不在主流程曝光。
