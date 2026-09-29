# EDA Workbench —— BBOS 全屏工作台 设计方案 v2

> 状态: 草案 v2(根据 de/ demo 反馈重做视觉规范)
> 范围: 仅 UI 骨架(visual skeleton),不做真实功能
> 目标产物: `bbos/gui/src/components/EDAPage.tsx` + 改造 `gui/src/styles.css`
> 视觉参考: `bbos/design/frontend/de/{index.html,app.js}`

---

## 1. 反馈 → 修正

| 用户反馈 | 旧方案 | 修正 |
|---|---|---|
| UI 太丑 | Tailwind utility classes 直拼,缺乏统一的 design token | 改用 de/ 同款 CSS variables + Inter 字体 + emerald 主题色 |
| 完全没有 de/ 的精致感 | `bg-background` / `border-border` 这类 token 颜色不够鲜明 | 引入 de/ 的 `--accent-color: #009c83 / #00bfa5` 替换 emerald-500 |
| 缺阴影 / 圆角 / 字体 | 没有用 Inter,圆角不统一 | 全量引入 Inter + `--shadow-{sm,md,lg}` + `--radius-{sm,md,lg,full}` |

**关键决策**(v2):
1. 引入 1 份 `eda.css`(可选)或扩展 `styles.css`,登记 de/ 的全部 design token
2. 用 `<link>` 在 `index.html` 引入 Inter 字体
3. 不再在组件里写 `text-emerald-500/10` 这种 token,改成 `style={{ background: 'var(--accent-bg)' }}` 模式
4. 布局保持 v1 的「5 区 Cursor 风」骨架,但视觉语言对齐 de/

---

## 2. 设计 Token(从 de/ 拷过来,登记到 styles.css)

```css
/* === EDA Theme === */
:root {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  /* Surface (light default) */
  --bg-primary: #fdfdfc;
  --bg-secondary: #f4f6f6;
  --bg-sidebar: #eef2f1;
  --bg-hover: #e8eded;
  --bg-code: #0d1117;

  /* Border */
  --border-color: #d9e0e0;
  --border-light: #e8eded;

  /* Text */
  --text-primary: #20292f;
  --text-secondary: #5d6972;
  --text-muted: #8a9399;
  --text-inverse: #ffffff;

  /* Accent (Codex green) */
  --accent-color: #009c83;
  --accent-hover: #007a66;
  --accent-bg: rgba(0, 156, 131, 0.08);
  --accent-border: rgba(0, 156, 131, 0.3);

  /* Status */
  --success-color: #07866f;     --success-bg: rgba(7, 134, 111, 0.12);
  --warning-color: #b76b08;     --warning-bg: rgba(183, 107, 8, 0.12);
  --danger-color:  #be3b36;     --danger-bg:  rgba(190, 59, 54, 0.12);
  --info-color:    #2679b9;     --info-bg:    rgba(38, 121, 185, 0.12);

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.06);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.08);

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  --scrollbar-size: 6px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #18181c;
    --bg-secondary: #222226;
    --bg-sidebar: #1e1e22;
    --bg-hover: #2a2a30;
    --bg-code: #0d1117;
    --border-color: #3a3a42;
    --border-light: #2a2a30;
    --text-primary: #e3e3e8;
    --text-secondary: #a1a1aa;
    --text-muted: #71717a;
    --accent-color: #00bfa5;
    --accent-hover: #00d4b8;
    --accent-bg: rgba(0, 191, 165, 0.10);
    --accent-border: rgba(0, 191, 165, 0.35);
    --success-color: #34d399;   --success-bg: rgba(52, 211, 153, 0.15);
    --warning-color: #fbbf24;   --warning-bg: rgba(251, 191, 36, 0.12);
    --danger-color:  #f87171;   --danger-bg:  rgba(248, 113, 113, 0.12);
    --info-color:    #60a5fa;   --info-bg:    rgba(96, 165, 250, 0.15);
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.3);
    --shadow-lg: 0 8px 24px rgba(0,0,0,0.4);
  }
}

/* === EDA 全局基线 === */
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: var(--bg-primary);
  color: var(--text-primary);
  height: 100vh;
  overflow: hidden;
}
::-webkit-scrollbar { width: var(--scrollbar-size); height: var(--scrollbar-size); }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
::selection { background: var(--accent-bg); }

@keyframes eda-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
@keyframes eda-appear {
  from { opacity: 0; transform: translateY(2px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## 3. 字体

`gui/index.html` 顶部加:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

> 跟 de/ 完全一致。

---

## 4. 布局骨架(沿用 v1 的「Cursor 5 区」)

```
┌──────────────────────────────────────────────────────────────────────┐
│                       TitleBar (48px)                                  │
├──────────────────────────────────────────────────────────────────────┤
│         Breadcrumb Header (36px) — workspace · toy · chip.toml       │
├────┬─────────┬──────────────────────────────────┬─────────┬──────────┤
│ AB │ Sidebar │  Editor Tabs (36px)                │  Right  │              │
│    │         ├──────────────────────────────────┤  Panel  │              │
│ 48 │  260    │                                  │         │              │
│ px │  px     │       Editor Content Area         │  300px  │              │
│    │         │                                  │         │              │
│    │         │                                  │         │              │
│    │         ├──────────────────────────────────┴─────────┤              │
│    │         │  Bottom Panel (240px)                       │              │
├────┴─────────┴─────────────────────────────────────────────┴──────────────┤
│              Status Bar (24px)                                          │
└──────────────────────────────────────────────────────────────────────┘
```

**视觉规范**:
- 所有间距用 px 直写,跟 de/ 一致
- 不再依赖 Tailwind 的 `bg-*` / `border-*` 这类 token,改用 `style={{ background: 'var(--bg-sidebar)' }}`
- 阴影 / 圆角 / 字号直接用 var
- 字体回退:Inter → -apple-system → BlinkMacSystemFont → 'Segoe UI'

---

## 5. 各区域具体样式(对齐 de/)

### 5.1 Activity Bar (48px)

```
[bg-sidebar] [border-right: 1px var(--border-color)]
垂直 5 个 44x44 button,间距 4px
active: 左侧 2px var(--accent-color) 边条
icon size: 18px, color: var(--text-muted), hover: var(--text-primary)
```

### 5.2 Sidebar (260px)

参考 de/ 的 `Sidebar` 组件。**Header / Search / FileTree / Footer 4 段**:

| 段 | 样式 |
|---|---|
| Header | `[bg-sidebar] [border-bottom]` padding 12/16,加 Folder icon + 项目名 + Settings icon |
| Search | `[bg-sidebar] [border-bottom]` 内部 input `[bg-primary] [border-color] radius-md`,padding 6/10 |
| FileTree | 用 de/ 的 `TreeView`,折叠/展开动画 200ms |
| Footer | `[border-top]` flex 两按钮 `New / Import`,均用 `variant="secondary"` Button |

### 5.3 Editor Area

#### Tabs Bar (36px)
```
[bg-sidebar] [border-bottom]
横向滚动 tab,每个 tab:
  [padding 8/12]
  - icon 12px
  - filename 12px
  - dirty marker (•) 12px var(--warning-color)
  - close × 12px var(--text-muted)
  active: bg-primary + border-bottom 2px var(--accent-color) + color accent
```

mock tab 列表(5 个):
1. `chip.toml` (TOML 编辑器,语法假高亮)
2. `schematic.canvas` (SVG 矩形 + 连线)
3. `waveform.vcd` (彩色横线 + 时间轴)
4. `ball-isa.csv` (Table 组件,6 行 mock)
5. `designs/toy.toml` (TOML 编辑器)

#### Content Area
按 activeTab 切换 5 种占位。共用 `[bg-primary]` 容器,padding 24。

| Type | 视觉 |
|---|---|
| TOML | `[Card]` 包裹,等宽字体 + 行号栏(左 36px muted),每行用 inline span 上色 |
| Schematic | SVG 占满,grid pattern + 1 个大方框(SoC) + 3 个小方框(Ball)+ 几条连接线 + 文字标签 |
| Waveform | SVG 占满,X 轴时间线 + 5 条彩色路径(`clk` 短脉冲 / `data` 长方块 / `done` 高脉冲 / `valid` 高电平 / `ready` 高电平) |
| Ball ISA | 用 shadcn 的 `Table` 组件,header 用 uppercase letter-spacing 0.5px,row hover bg-hover |
| TOML | 同上 |

### 5.4 Right Panel (300px)

复用 de/ 的 `RightPanel` 模式,2 section tab:

| Tab | 内容 |
|---|---|
| Workspace | de/ 同款 Explorer(树 + 搜索 + 底部 New/Import) |
| AI Assistant | 嵌入**复用现有 AgentPanel**(只是样式要适配 EDA 主题) |

顶部 tab bar:`flex 1`,active `border-bottom: 2px var(--accent-color)`,最右侧 collapse 按钮 `[border-left]`。

### 5.5 Bottom Panel (240px)

4 tab + 折叠:

| Tab | 内容 |
|---|---|
| Console | mock 日志,按 level 上色(info=secondary / success=success / warning=warning / error=danger) |
| Waveform | 复用上面的 SVG 波形,放大版,左右双栏(信号列表 + 波形) |
| Problems | mock error / warning 列表,左侧文件路径 + 行号,右侧 message + 颜色 dot |
| Terminal | `$ bbdev verilator ...` 命令行假数据,光标闪烁 |

折叠按钮在右下角,展开时右下三角朝上,折叠时朝下。

### 5.6 Status Bar (24px)

```
[bg-sidebar] [border-top]
flex 5 段,每段 padding 0 12,字号 11px,色 var(--text-muted)
1. branch 图标 + main
2. ↑0 ↓0
3. 绿点 + bb-server : 38421
4. 黄点 + bbdev / Nix
5. Ln 12, Col 4 (UTF-8, LF)
```

---

## 6. 组件级规范(全部从 de/ 抄样式)

每个组件用 `var(--*)`,不用 Tailwind token:

| 组件 | 关键样式 |
|---|---|
| `Button` | padding `8 14`,fontSize 13,radius `--radius-md`,primary=accent,hover opacity 0.85,disabled opacity 0.5 |
| `Input` | padding `8 12`,fontSize 13,radius `--radius-md`,focus border `var(--accent-color)`,transition 0.15s |
| `Card` | bg `--bg-secondary`,border `--border-color`,radius `--radius-lg`,shadow `--shadow-sm`,padding 16 |
| `Badge` | padding `2 8`,radius `--radius-full`,fontSize 11,5 个 variant(default/success/warning/danger/info) |
| `Select` | 同 Input,加 cursor pointer |
| `Divider` | `1px var(--border-color)`,margin 16/0 |
| `TreeItem` | padding `6 12`,hover bg `--bg-hover`,active bg `--accent-bg` + color accent |

---

## 7. 文件改动清单

| 文件 | 改动 |
|---|---|
| `gui/index.html` | 加 Inter `<link>` 标签 |
| `gui/src/styles.css` | 在末尾追加 §2 的 EDA Token + 基线 + 动画 |
| `gui/src/components/EDAPage.tsx` | **新增**,单文件 ~900 行(复用 de/ 全部组件 + EDA 扩展) |
| `gui/src/main.tsx` | 加 hash router |
| `gui/src/components/AppHeader.tsx` | 加「Open EDA」按钮 |
| `gui/src/components/AgentPanel.tsx` | 改用 de/ 的样式 token(把 `text-emerald-500` 等替换成 `var(--accent-color)`),保证 EDA 页内能正常显示 |

---

## 8. 不做的事(显式)

- ❌ 不动 Tailwind 配置 —— de/ 不用 Tailwind,EDA 也不用,Tailwind 留给 Home 用
- ❌ 不写 Tauri command / SSE
- ❌ 不重写 AgentPanel 业务逻辑,只换样式 token
- ❌ 不动现有 Home 页
- ❌ 不引入新图标库(de/ 的 SVG 直接拷)

---

## 9. 验收

- [ ] 浏览器开 `#/eda`,默认 dark theme 配色跟 de/ 截图一致
- [ ] 切到系统 light 主题,EDA 页变浅色(de/ 用 `prefers-color-scheme` 触发)
- [ ] Inter 字体正确加载,所有文字是 Inter(不是系统默认 sans-serif)
- [ ] Activity Bar / Sidebar / Editor / RightPanel / BottomPanel / StatusBar 6 区齐全
- [ ] Activity Bar 切 5 个 section,Sidebar 内容跟着切
- [ ] Editor Tab 5 个,各自内容区不一样
- [ ] Right Panel 的 AI tab 显示真实 `AgentPanel`,样式统一
- [ ] Console tab 6 行彩字日志
- [ ] `#/` 仍然显示原 Home,样式不动

---

## 10. 实施步骤

| 步骤 | 内容 | 估时 |
|---|---|---|
| 1 | 写本设计文档 v2 | 已完成 |
| 2 | `gui/index.html` 加 Inter font link | 2min |
| 3 | `gui/src/styles.css` 追加 EDA token + 基线 | 5min |
| 4 | 写 `EDAPage.tsx` 单文件 | 35min |
| 5 | `AgentPanel.tsx` 改用 CSS var token | 10min |
| 6 | `main.tsx` hash router + `AppHeader.tsx` 加按钮 | 5min |
| 7 | 浏览器视觉验 | 5min |

总计 ~60min。

---

## 11. 风险 & 决策记录

| 风险 | 决策 |
|---|---|
| Inter 字体走 CDN,断网无字体 | 已有完整 fallback chain(-apple-system 等) |
| Tailwind + CSS var 混用,容易搞混 | EDA 页用纯 CSS var,Home 用 Tailwind,各自负责自己范围 |
| AgentPanel 改 token 会动 Home 的样式 | 验证:Home 用的 token 跟 EDA 的同名(var(--bg-primary)等),改成 var 反而两边都受益 |
| de/ 的 demo 用 inline style,可读性差 | EDA 也用 inline style,但抽小组件内部用 const style = { ... } |