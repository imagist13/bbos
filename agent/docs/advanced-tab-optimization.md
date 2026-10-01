---
Status: Draft
Last updated: 2026-09-30
Scope: EDAPage "Advanced" tab 当前实现的 bug / 性能 / 代码质量 / UX 优化清单
Prereq: 与 `advanced-tab-roadmap.md` 配套 —— roadmap 列 "做什么"，本文列 "把现在做的做得更好"
Related: `gui/edaStudio/pages/AdvancedPage.tsx` · `gui/{EDASidebar,EDATabsBar,FileEditor,EDARightPanel}.tsx` · `main/api/trpc/routers/eda.ts`
---

# Advanced tab 优化清单

> 全部条目都附严重度（🔴 必修 / 🟡 应修 / 🟢 可修）与可定位的修法。改动前请先 grep 确认当前实现没变。

## 1. Bug 与隐患

### 🔴 1.1 fs-event 没人订阅

`routers/eda.ts` 已写好 `startWatching` / `stopWatching`，通过 `webContents.send('eda:fs-event', payload)` 广播；但 `AdvancedPage` 完全没订阅这条 channel。

**后果**：
- 外部编辑器改了文件，AdvancedPage 里 readFile 缓存不刷新 → 编辑器看到旧内容。
- 新建/删除/重命名文件，sidebar 树不更新 → 文件出现/消失用户看不到。
- 即便自己点 Save 写盘，listFiles 也不刷新（虽然 readFile 显式 invalidate 了）。

**修法**：见 roadmap P0.1。

### 🔴 1.2 关 tab 不检查 dirty

`AdvancedPage.closeFile` 直接 `setOpenFiles(prev => prev.filter(...))`，drafts 同步删。误触 × 直接丢稿，且没有 undo。

**修法**：

```ts
function closeFile(id: string) {
  if (drafts.has(id)) {
    const choice = await dialog.showMessageBox({
      type: 'question',
      buttons: ['Save', 'Discard', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      message: `Save changes to ${path.basename(id)} before closing?`,
    });
    if (choice === 2) return; // Cancel
    if (choice === 0) {         // Save
      await save(id);           // refactor out
    }
    // choice === 1 → Discard, fall through
  }
  // 真正 close
}
```

外加 window 的 `beforeunload` 监听，至少 1 个 dirty 时 confirm。

### 🟡 1.3 activeId 在外部 rename 后 stale

如果用户在外部 `mv foo.toml bar.toml`：

- listFiles 重扫后树更新（前提是 P0.1 修了）；
- 但 `openFiles` 里的 entry 还指向 `foo.toml`；
- 切到那个 tab 时 FileEditor 拿旧 path 调 `readFile` → 失败 → 显示 "File not found"。

**修法**：监听 fs-event 时，如果 `event.type === 'rename'` 且 `event.path` 命中 `openFiles[*].id`，用 `path` 作为新 key 同步更新 tab + draft key。或者更稳：rename 时直接关掉对应 tab + 提示用户。

### 🟡 1.4 Map key 用 path 字符串容易出规范性问题

`newId(node.path) === node.path` —— 如果 TreeNode 给的 path 含 `\` 而别处用 `/`（或反之），会变成两个 key 指向同一文件。Windows 上 path.sep 是 `\`，但 readFile 透传回来的 path 也是 `\`，目前不出问题，但边界场景：

- path 在不同过程里被 normalize 过 → key 不一致；
- 大小写敏感：Windows 不区分大小写但 Node 是区分的。

**修法**：canonical key helper `toCanonicalPath(p)`（统一 separator + lowercase on Windows），`openFiles` 索引 + draft key + readFile cache key 都走它。

### 🟡 1.5 切换 workspace 时 draft 可能不丢

closeFile 路径里清 draft，但用户切 workspace（`setWorkspace(other)`）时没有清理 `drafts` Map。如果保留同一份 `openFiles`（绝对路径仍是文件），draft 还在；如果 openFiles 早就空了（用户先关了所有 tab），draft Map 里的 entry 还在浪费内存。

**修法**：监听 `workspace` 变化：

```tsx
useEffect(() => {
  if (workspace) return;
  setDrafts(new Map());
}, [workspace]);
```

### 🟢 1.6 `useState<Map>` 每次 setDrafts 都是新 Map

```tsx
setDrafts((prev) => {
  const next = new Map(prev);
  next.set(activeId, content);
  return next;
});
```

每次 keystroke 都 copy 一遍 Map。大文件高频打字时多余 allocation。

**修法**：高频路径用 reducer（immer）。或者直接绕过 Map，key = path，value = draft，store 用 plain object：

```tsx
const [drafts, setDrafts] = useState<Record<string, string>>({});
const setDraft = (path: string, content: string) =>
  setDrafts((d) => (d[path] === content ? d : { ...d, [path]: content }));
```

外加 `dirtyPaths` 派生用 `useMemo` 算 `Set` —— 现在每次 render 都 `new Set(drafts.keys())`，drafts 不变时也新建。

## 2. 性能

### 🟡 2.1 Monaco 第一次打开卡

`@monaco-editor/react` 第一次加载要从 CDN 拉 monaco + workers（除非 vite 已 `monaco-editor-webpack-plugin` 处理，参考 `TomlEditor` 当前的 import）。用户第一次开 .toml 会卡几百 ms 到几秒。

**修法**：进 AdvancedPage 时立即 `import('@monaco-editor/react')()` 预热（**不**实例化 editor，只加载 lib）。具体：

```tsx
useEffect(() => {
  import('@monaco-editor/react').then((mod) => mod.loader.init());
}, []);
```

### 🟡 2.2 listFiles 缺 debounce + 客户端 cache

切 workspace 一次 listFiles；fs-event 来一次 invalidate 重设。大量文件 + 高频 fs-event 会刷爆。

**修法**：
- 客户端 `useQuery(['listFiles', workspace], ..., { staleTime: 5_000 })` 避免 5s 内重查。
- fs-event handler 里加 `setTimeout` debounce 500ms，再批量 invalidate。

### 🟢 2.3 readFile cache key 设计

当前 tRPC 自动按 input 做 key（`{ path }`），所以同一个 path 不同时候查会命中。这是对的，但：**切换 workspace 后老 cache 不会清**。结合 P2.2 一起修。

### 🟢 2.4 FileEditor 派发条件

```tsx
if (query.data && query.data.kind !== file.kind) {
  // 切走类型不一致时不要把旧缓存闪一下:kind 变了就当作 pending。
  return <Pending />;
}
```

这是 v0.3 留下来的 hack：FileEditor 同时拿 `file.kind`（OpenFile 自带）和 `query.data.kind`（服务端返回）。如果用户开 `foo.toml` 实际是个 binary，服务端 `readFile` 会失败 → `query.data` undefined → 走 else 分支 → 显示 `Pending`。**死循环**。

**修法**：失败时显示一个明确的错误 UI（"Failed to read foo.toml: ..."），不要假装 pending。

## 3. 代码质量

### 🟡 3.1 AdvancedPage.tsx 169 行偏长，混了 4 个 concern

拆成 3 个 hook：

```ts
// 文件树
function useWorkspaceTree(workspace: string | null) {
  return trpc.eda.listFiles.useQuery(
    { path: workspace ?? '' },
    { enabled: Boolean(workspace) },
  );
}

// tabs
function useOpenTabs() {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // open / close / select / ... 全部内聚
  return { openFiles, activeId, open, close, setActive };
}

// drafts
function useDirtyDrafts(activeId: string | null) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // dirty / set / save / discard
  return { drafts, dirtyPaths, setDraft, saveActive, discardActive };
}
```

`AdvancedPage` 主体只剩 layout + wiring（约 50 行）。

### 🟡 3.2 FileKind 字符串硬编码 4 处

加新文件类型（如 `.json` / `.yaml`）要改：

- `routers/eda.ts` `SUPPORTED_EXTS` + `extKind`
- `gui/types.ts` `FileKind`
- `gui/FileEditor.tsx` 派发表
- `gui/AdvancedPage.tsx` `node.kind` 检查

**修法**：抽到 `gui/fileKind.ts`：

```ts
export const FILE_KINDS = ['toml', 'canvas', 'vcd', 'csv'] as const;
export type FileKind = (typeof FILE_KINDS)[number];
export function extToKind(ext: string): FileKind | null { ... }
export function kindToExt(kind: FileKind): string { ... }
```

router 与 renderer 都从这一个文件 import（renderer 端允许 import 纯类型函数）。

### 🟢 3.3 EDARightPanel.tsx dead code

不在 `AdvancedPage` 用、不在 `EDAPage` 用、不在任何路由用。`README_LEGACY.md` 列了它但说"留作 v0.5+ Chat 复用模板" —— 但 v0.5 已经做完，没有用它。

**决定**：

- 如果 v0.6+ 不引入 Chat 侧栏，删。
- 如果要引入，挪到 `gui/edaStudio/components/RightPanel/` 并挂到 `OverviewPage` 旁边。

### 🟢 3.4 FileEditor 内部用 trpc 没法单测

`FileEditor` 直接 `trpc.eda.readFile.useQuery(...)`，单测要 mock 整个 trpc 客户端。改成 inject：

```tsx
export function FileEditor({ file, draft, onChange, readFile }) {
  const query = (readFile ?? defaultReadFile)({ path: file.path });
  // ...
}
```

测试时传 mock `readFile`。或者更直接：用 `@tanstack/react-query` 的 `QueryClientProvider` 局部覆盖 + 测试 fixture。

## 4. UX

### 🟡 4.1 sidebar 没 refresh 按钮

P0.1 没修之前，用户外部操作后无救济。短期方案：sidebar 顶部加一个"⟳"图标按钮，点了 `utils.eda.listFiles.invalidate({ path: workspace })`。

### 🟡 4.2 active file 在 sidebar 没高亮

`EDASidebar` 收到 `activeFileId` prop 但没拿来做高亮（看到 prop 名有但 UI 没接）。修：树节点的 file 节点 + activeFileId 命中时背景色变 + 加左边 2px accent 边框。

### 🟡 4.3 Tab 没 overflow

开 >10 个 tab 会挤压到 0 宽。看 P1.2。

### 🟢 4.4 语言图标

`.toml` / `.vcd` / `.csv` / `.canvas` 都画同一个文本图标。改成 lucide 图标 + kind badge：

- toml → `FileCode`
- vcd → `Activity`
- csv → `Table`
- canvas → `PenTool`

Sidebar 文件节点 + TabBar tab 都加。

### 🟢 4.5 空 workspace CTA 文案

`EDASidebar` 当 `!workspace` 时显示一个按钮。看看实际文案是不是 "Pick workspace" —— 改成明确说明：可以选 buckyball repo 根，或任意含 `.toml` / `.canvas` 的目录。

### 🟢 4.6 Editor 空状态

`AdvancedPage` 当 `!activeFile` 显示 "Open a .toml / .canvas / .vcd / .csv file from the Explorer..."。如果 sidebar 已经有文件但用户没点（很可能在大目录里翻），体验差。短期加一个 "Recent files" 列表（本地记最近 10 个 open 过的文件，按 mtime 排）。

### 🟢 4.7 状态栏

底部加一个 statusbar：`Ln X, Col Y · UTF-8 · LF · {file kind}`。Monaco 自带 cursor position，可以监听。

## 5. 集成层

### 🟡 5.1 WaveformViewer.tsx 是占位

读了一下，VCD 文件 dump 第一行 + 第一时间戳 sample 就完事了。**没**接 waveform-mcp。`WaveformsPage`（主 tab）走 waveform-mcp，Advanced tab 的 viewer 是死的。

**修法**：抽 `parsers/vcd.ts` 的真实解析；viewer 调 waveform-mcp 拿 signal list + 采样 + render（用 d3 或 canvas，避免再装 5MB 依赖）。

### 🟢 5.2 parsers/toml.ts 复用 vs 重写

`TomlEditor` 是不是用 `parsers/toml.ts` 做校验？还是直接调 monaco-toml language？先 grep：

```
grep -r "parsers/toml" gui/ src/
```

如果没引用 → dead code，删掉或挪到 `gui/editors/toml/validate.ts`（P3.2 用）。

### 🟢 5.3 权限校验

`writeFile` 走 `routers/eda.ts` 直接 `writeFileSync`，没校验 path 是否在 workspace 内 —— 用户如果在 sidebar 里 open 了一个 `/etc/passwd`（假设 listFiles 让他开到了，理论上不会因为 path 校验会拦），写盘会直接成功。

**修法**：`writeFile` / `renameFile` / `createFile` / `deleteFile` 入口校验：

```ts
const workspace = getActiveWorkspace(); // 从 session / store 拿
if (!workspace || !input.path.startsWith(workspace)) {
  throw badRequest(`Path outside workspace: ${input.path}`);
}
```

`activeWorkspace` 还没存 main 侧 —— 短期 main 侧维护一个 `currentWorkspace` 变量（advancedPage 启动时调 `setActiveWorkspace` mutation 通知 main）。

## 6. 测试

### 🟡 6.1 完全没单测

`AdvancedPage` / `FileEditor` / `EDASidebar` 都没有 `.test.tsx`。至少加：

- `parsers/toml.test.ts` — 给几个 fixture，断言 parse 结果。
- `types.ts` 的 `toCanonicalPath` 如果写了，加测试。

`AdvancedPage` 集成测试太重（要 mock trpc + react-query + monaco），先不做。

## 7. 实施顺序建议

按 ROI（影响 × 容易度）排，**一次性小批提交**：

| 批 | 包含 | 估时 |
|---|---|---|
| 批 1 | 1.1 (fs-event) + 1.2 (close guard) + 4.1 (refresh btn) | 1 天 |
| 批 2 | 1.4 (canonical key) + 1.5 (clear drafts on ws change) + 1.6 (plain obj drafts) | 0.5 天 |
| 批 3 | 3.1 (拆 hook) + 3.2 (FileKind 单一源) | 1 天 |
| 批 4 | 4.2 (sidebar 高亮) + 4.4 (kind 图标) + 4.7 (statusbar) | 1 天 |
| 批 5 | 5.3 (写盘权限校验) + 6.1 (单测起步) | 1 天 |

之后接 roadmap 推进 P1-P3。