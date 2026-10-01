---
Status: Draft
Last updated: 2026-09-30
Scope: EDAPage "Advanced" tab（文件树 + 多 tab + 编辑器）后续开发路线图
Prereq: v0.5 已接通 trpc.eda.* + bb-mock 数据源；bb-server 待接入
Related: `gui/README_LEGACY.md` · `gui/edaStudio/pages/AdvancedPage.tsx` · `main/api/trpc/routers/eda.ts`
---

# Advanced tab 后续开发计划

## 0. 现状摘要（基线 v0.5）

- **入口**：`EDAPage` topbar 第 5 个 tab（`advanced`）。
- **布局**：`EDASidebar`（220px）| `EDATabsBar` + `FileEditor`，全屏无 nested scroll。
- **数据源**：`trpc.eda.{defaultWorkspace, pickWorkspace, listFiles, readFile, writeFile}` + `startWatching/stopWatching`（router 已写但 renderer 未订阅）。
- **编辑器派发**：`FileEditor` 按 `file.kind` 选 `TomlEditor` / `SchematicEditor` / `BallIsaTable` / `WaveformViewer`。
- **状态归属**：`openFiles` / `activeId` / `drafts` 都在 `AdvancedPage` 内 useState，**不持久化**，刷新即丢。
- **主流程 4 个 tab**（Overview/Chips/Balls/Waveforms）仍用 `bb-mock`，bb-server 待接入。

## 1. 优先级矩阵

| 阶段 | 标题 | 触发问题 | 工作量 | 依赖 |
|---|---|---|---|---|
| P0.1 | 订阅 fs-event，外部修改可见 | `startWatching` 写好但没人订阅，编辑器看到的是缓存 | XS | — |
| P0.2 | 关 tab 前 dirty 检查 | 误触 × 直接丢稿 | S | — |
| P0.3 | 键盘快捷键（Ctrl+S/W/Tab） | 用户预期 | S | — |
| P0.4 | Sidebar 文件搜索框 | workspace 大时树难翻 | S | — |
| P1.1 | 新建 / 重命名 / 删除文件 | 只能开现有文件 | M | P0.1 |
| P1.2 | Tab overflow scroll | 开 >10 个 tab 挤爆 | XS | — |
| P1.3 | Monaco 主题跟随 app | 视觉一致 | XS | — |
| P1.4 | Monaco eager-load | 第一次打开卡 | S | — |
| P2.1 | bb-server 替换 bb-mock | 主流程 4 tab 真数据 | L | bb-server |
| P2.2 | readFile cache 按 workspace 拆分 | 切 workspace 不自动失效 | S | — |
| P2.3 | tab + draft 持久化 | 刷新还原现场 | M | — |
| P3.1 | toml editor：schema-based autocomplete | chip.toml 字段多易写错 | L | bb-server |
| P3.2 | toml editor：实时校验（错误行高亮） | 写错无反馈 | M | parsers/toml |
| P3.3 | BallIsaTable 编辑模式 | 只读不让改 | L | — |
| P3.4 | WaveformViewer 接 waveform-mcp | 现在的 viewer 是占位 | M | waveform-mcp |
| P3.5 | SchematicEditor 真渲染 or 删 | dead code 候选 | S | 设计决策 |
| P4.x | 拖放 / 多 workspace / 状态栏 / diff / git blame | 锦上添花 | L each | — |

总工作量估算：P0 ≈ 0.5 周 · P1 ≈ 1 周 · P2 ≈ 1.5 周 · P3 ≈ 3 周 · P4 视需求。

## 2. P0 详细方案（必做，本周内）

### P0.1 — fs-event 订阅

**当前**：`main/api/trpc/routers/eda.ts` 已实现 `startWatching`/`stopWatching`，watcher 用 `fs.watch({recursive:true})`，事件通过 `webContents.send('eda:fs-event', payload)` 广播给所有窗口。

**缺失**：renderer 端没人订阅这条 channel。后果是：

- 在外部编辑器改了文件，AdvancedPage 里的 `readFile` 缓存 stale；
- 新建/删除/重命名文件，sidebar 树不更新；
- 自己点 Save 写盘后，本地缓存 `staleTime` 内不会重读（虽然我们 explicit invalidate 了 readFile，但 listFiles 没动）。

**实现**（AdvancedPage 内加）：

```tsx
// 在 useEffect 里订阅 trpc ipcLink 的 wsClient / 直接走 ipcRenderer
useEffect(() => {
  if (!workspace) return;
  const sub = trpc.eda.startWatching.subscribe({ path: workspace }, () => {});
  // 订阅 eda:fs-event channel
  const handler = (_e: unknown, payload: { type: 'change'|'rename'; path: string }) => {
    utils.eda.listFiles.invalidate({ path: workspace });
    utils.eda.readFile.invalidate({ path: payload.path });
    // 如果 payload.path 正好等于 activeId，给用户一个 "file changed on disk" 提示
  };
  window.electron.ipcRenderer.on('eda:fs-event', handler);
  return () => {
    window.electron.ipcRenderer.off('eda:fs-event', handler);
    trpc.eda.stopWatching.mutate();
  };
}, [workspace]);
```

具体 ipcRenderer API 以项目内 `electron-trpc` 的封装为准 —— 大概率走 `trpc.<router>.<proc>.subscribe` 或者直接 `trpcClient.event.on('eda:fs-event', handler)`。先 grep `eda:fs-event` 确认注册侧。

**测试**：`bun run dev`，在 Advanced tab 打开一个 .toml，外部 vim 改一行 + `:w`，回 App 看 TabBar 高亮 + Editor 内容刷新。

### P0.2 — 关 tab 前 dirty 检查

**当前**：`closeFile` 直接 `setOpenFiles(prev => prev.filter(...))`，drafts 里对应 entry 单独删。误触关掉就丢。

**方案**：弹原生 dialog 走 trpc（`dialog.showMessageBox` 复用 `main/api/dialog.ts` 已有封装），三选项 Save / Discard / Cancel：

```
Save    → 走 onSave 逻辑，成功后 close
Discard → 直接 close
Cancel  → 不动
```

如果整个 window 关闭（X 按钮）也有 dirty，也走同样对话框。需要一个 hook：`useUnsavedGuard(dirtyPaths)`，监听 window beforeunload + 自己包 close 按钮。

### P0.3 — 键盘快捷键

最小集：

| 键 | 行为 | 范围 |
|---|---|---|
| `Ctrl/Cmd+S` | save active tab | AdvancedPage focus 时 |
| `Ctrl/Cmd+W` | close active tab（带 dirty 检查） | AdvancedPage focus 时 |
| `Ctrl/Cmd+Tab` | 切到下一个 tab（同 VS Code） | AdvancedPage focus 时 |
| `Ctrl/Cmd+Shift+Tab` | 上一个 tab | 同上 |
| `Ctrl/Cmd+P` | 打开文件搜索（cmd palette 风格） | global |
| `Ctrl/Cmd+Shift+P` | 命令面板 | global |

**实现**：单独写 `useShortcuts(map, deps)` hook，绑到 `window` keydown。Cmd palette 复用已有 cmdk（在 main branch 上），renderer 单独包一层。

### P0.4 — Sidebar 搜索框

`EDASidebar` 顶部加一个 input，按文件名扁平过滤树（递归匹配，不改树结构，只 hide）。3 行代码能搞定。

## 3. P1 详细方案

### P1.1 — 文件 CRUD

新增 3 个 trpc procedure（`routers/eda.ts`）：

- `createFile({ path, content? })` — 写空文件 / 默认 template
- `renameFile({ from, to })` — `renameSync`，跨目录允许（`fs.rename` 不允许 → 退化成 copy + delete + 通知 sidebar 树更新）
- `deleteFile({ path })` — `unlinkSync`（不递归删目录，目录删除走 `deleteDir` 单独做）

UI：Sidebar 文件右键菜单（`Edit / Rename / Delete / Copy path / Reveal in OS`）；编辑器顶部加 "New File" 按钮（弹 path 输入框 + 文件类型选项）。

### P1.2 — Tab overflow

`EDATabsBar` 当前是 flex row，10+ tab 会挤压到 0 宽。改成：

```
<nav className="flex h-9 overflow-x-auto"> ... </nav>
```

或者 tab 数 > N 时收成 dropdown（VS Code 风格）—— 选 dropdown 更接近用户预期。

### P1.3 / P1.4 — Monaco 主题 + eager-load

- 主题：app 的 `data-theme` 切换时，`TomlEditor` 用 `monaco.editor.setTheme('vs' | 'vs-dark')`。
- eager-load：`AdvancedPage` mount 时 `import('@monaco-editor/react')()`，不绑定 file，等 Monaco loader 缓存好。

## 4. P2 — 数据层升级

### P2.1 — bb-server 真数据接入

主流程 4 tab（Overview/Chips/Balls/Waveforms）当前读 `bb-mock.ts`，要在 bb-server 跑起来后切到真数据。

**接口边界**（按 `bb-server` 实际暴露情况调整）：

```ts
// bb-mock.ts → bb-server
const chips = useQuery(['chips'], () => trpc.bb.listChips.query());
const balls = useQuery(['balls'], () => trpc.bb.listBalls.query());
const waveforms = useQuery(['waveforms'], () => trpc.bb.listWaveforms.query());
```

**风险点**：bb-mock 是同步的（直接 import 对象），切到真数据后变成 async + loading/error 三态，4 个 page 都要做 skeleton。

### P2.2 — readFile cache per workspace

当前 `utils.eda.readFile.invalidate({ path })` 只失效单个文件。切换 workspace 时应该全清。

**方案**：在 `AdvancedPage` 的 useEffect 监听 `workspace` 变化，切之前调 `utils.eda.readFile.invalidate()`（无参数 → 清全部）。`listFiles` 同理。

### P2.3 — tab + draft 持久化

`openFiles` + `activeId` + `drafts` 提到 `useStudioStore`，加 localStorage backing。刷新还原现场。

**风险**：draft 内容可能很大（一个 1MB 的 .vcd），localStorage 撑不住 → 改成 IndexedDB（用 `idb-keyval` 这种 2KB 的 wrapper）。

## 5. P3 — 编辑器深度（按 ROI 排序）

1. **toml real-time 校验**：成本最低（`parsers/toml.ts` 已有），错误行高亮 + gutter 红点。
2. **BallIsaTable 编辑**：ball 用户最常改的字段都集中在表里，编辑模式收益大。
3. **WaveformViewer 接 waveform-mcp**：现在 viewer 只渲染第一行 dump，浪费。
4. **toml autocomplete（schema）**：高 ROI 但需要 chip.toml 的 schema 定义，依赖 bb-server 输出。

## 6. 不做（明确出 scope）

- 协作编辑（多 user 实时 cursor）：本产品定位单机。
- 内嵌 terminal：chat 已经有 bash tool，独立 terminal panel 重复。
- git 集成：用户用外部 git 客户端足够。

## 7. 验收标准（每阶段）

- P0 完成：能在 Advanced tab 内完整跑通 "vim 外改 → app 内可见 → 自己改 → cmd+s 保存 → 切换 workspace 不串缓存" 闭环。
- P1 完成：能完成 "新建 toml → 编辑 → 保存 → 重命名 → 删除" 全链路。
- P2 完成：关掉 App 重开，tab + draft 还在；切 workspace 缓存干净。
- P3 完成：toml 错误实时标红；waveform viewer 展示 waveform-mcp 真实信号。