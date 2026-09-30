# 旧 EDA 组件(v0.5 复活 → Advanced tab)

v0.3 阶段的"伪 IDE" 文件树 + Monaco 编辑器组件,**v0.5 起通过 EDAPage 的
"Advanced" tab 曝光**(`AdvancedPage` 接 `trpc.eda.*`,开盒即用)。

## 文件

- **`EDASidebar.tsx`** — 文件树 sidebar,支持 pickWorkspace / 树展开 / 点击打开文件
- **`EDATabsBar.tsx`** — 多文件 tab bar,显示 dirty 标记 + 关闭按钮
- **`FileEditor.tsx`** — 按 `file.kind` 派发到对应编辑器;内嵌 `useInvalidateReadFile`
- **`types.ts`** — `OpenFile` / `TreeNode` / `FileKind` 类型
- **`editors/`** — 4 种编辑器实现:
  - `TomlEditor` — toml 文件 Monaco 编辑器
  - `SchematicEditor` — 原理图(已 deprecated,只占位)
  - `BallIsaTable` — Ball ISA 表格视图
  - `WaveformViewer` — VCD 波形 viewer(简化版,真正的波形分析走 waveform-mcp)
- **`parsers/`** — toml / vcd 解析工具

## 历史

v0.4 阶段曾被打到 `_legacy/`(死代码,edapage 主流程不引),v0.5 移到
`gui/` 顶层并接入 `AdvancedPage` —— 见 `edaStudio/pages/AdvancedPage.tsx`。

## 注

- `EDARightPanel.tsx` 仍在 `gui/` 顶层但未挂载(AdvancedPage 不使用)。
  留作 v0.5+ 引入 EDA Chat 时的复用模板,删之前先 grep 确认无引用。
