# BBOS GUI

> Buckyball Operating System — Desktop IDE for `bbdev`.

[`English`](#english) · [简体中文](#简体中文)

---

<a id="english"></a>

## English

**BBOS GUI** is the desktop front-end of [BBOS](../). It wraps the
[`bbdev`](../../../) CLI into a visual workbench so that new users can go from
"able to run" to "able to modify" in a day instead of a week (SPEC §1.2).

### What's inside

A single-page Tauri shell driven by `src/pages/Home.tsx`, laid out as four
main partitions that map directly to the BBOS SPEC (Phase B):

| Partition  | Component          | Purpose                                                  |
| ---------- | ------------------ | -------------------------------------------------------- |
| **chip**   | `ChipEditor`       | Chip-level TOML configuration (one truth source)        |
| **design** | `DesignEditor`     | Hardware-design workbench editor                         |
| **ball**   | `BallISAEditor`    | Ball ISA instructions and ISA-level settings             |
| **sim**    | `Simulator`        | Verilator / Spike / VCS / FireSim run panel              |

Supporting chrome: `AppHeader`, `LeftDrawerNav`, `RightPanel`, `TitleBar`,
`AgentPanel`, `Explorer`, `mode-toggle` (light / dark / system), custom toast
(`sonner`) and the `useT` + `lib/i18n` internationalization stack.

### Tech stack

| Layer        | Choice                                                           |
| ------------ | ---------------------------------------------------------------- |
| Shell        | **Tauri 1** (Rust, `src-tauri/`)                                 |
| UI runtime   | **React 18** + **TypeScript 5**                                  |
| Bundler      | **Vite 5** (with `@vitejs/plugin-react`)                         |
| Styling      | **Tailwind CSS 3** + Shadcn UI on Radix primitives               |
| State        | **Jotai** atoms (`src/atoms/`)                                   |
| Forms / data | `react-hook-form`, `zod`, `@tanstack/react-table`, `recharts`   |
| i18n         | Home-grown in `src/lib/i18n.ts` (`zh-CN` + `en`)                |
| Tooling      | Prettier 3, `tsc --noEmit`, Tailwind typography                 |

### Project layout

```
gui/
├── src/
│   ├── atoms/                       # Jotai atoms (shared UI state)
│   ├── components/                  # App + Shadcn UI building blocks
│   │   ├── ui/                      # 50+ Shadcn (Radix) components
│   │   ├── AppHeader.tsx            # Top header
│   │   ├── LeftDrawerNav.tsx        # Primary partition switcher
│   │   ├── RightPanel.tsx           # Secondary panel / AI dock
│   │   ├── ChipEditor.tsx           # chip partition
│   │   ├── DesignEditor.tsx         # design partition
│   │   ├── BallISAEditor.tsx        # ball partition
│   │   ├── Simulator.tsx            # sim partition
│   │   ├── AgentPanel.tsx           # AI Agent dock
│   │   ├── Explorer.tsx             # Workspace file explorer
│   │   ├── TitleBar.tsx             # Custom draggable title bar
│   │   ├── theme-provider.tsx       # light / dark / system
│   │   ├── mode-toggle.tsx          # Theme switch widget
│   │   ├── constants.ts             # DEFAULT_SUB_TABS, etc.
│   │   ├── types.ts                 # Shared TS types
│   │   ├── controls.tsx             # Form controls
│   │   ├── icons.tsx                # Lucide icon wrappers
│   │   └── useT.ts                  # Translation hook
│   ├── hooks/                       # Reusable hooks (use-mobile, ...)
│   ├── layouts/                     # Layout shells
│   ├── lib/
│   │   ├── i18n.ts                  # zh-CN + en translation tables
│   │   ├── mockData.ts              # Mock chip/design/ball fixtures
│   │   └── utils.ts                 # `cn()` and helpers
│   ├── pages/Home.tsx               # Single-page entry (Phase B)
│   ├── assets/                      # Static assets bundled by Vite
│   ├── main.tsx                     # React root
│   ├── styles.css                   # Tailwind layers + CSS variables
│   └── vite-env.d.ts                # Vite ambient types
├── src-tauri/                       # Rust desktop backend
│   └── src/main.rs
├── public/                          # Static files copied as-is
├── index.html                       # Vite entry HTML
├── vite.config.ts                   # `@/` alias, React plugin
├── tailwind.config.js               # Design tokens
├── postcss.config.js                # Tailwind + autoprefixer
├── components.json                  # Shadcn generator config
├── tsconfig.json                    # TS config (strict)
├── .prettierrc.json
├── bun.lock                         # Lockfile (pnpm / npm also work)
└── package.json                     # Scripts: dev / build / tauri / format
```

### Prerequisites

- Node.js **18+**
- Rust toolchain (stable) — required by Tauri
- Platform-specific Tauri deps (see <https://tauri.app/start/prerequisites/>):
  - **Windows**: WebView2 + MSVC build tools
  - **macOS**: Xcode CLT
  - **Linux**: `webkit2gtk`, `libssl`, etc.

### Install & run

```bash
# from this directory
npm install             # or: pnpm install / bun install

npm run dev             # web-only preview (Vite)
npm run tauri dev       # launch the desktop app with HMR
```

The first `npm run tauri dev` will compile the Rust side — be patient, later
runs are fast.

### Available scripts

| Command                  | What it does                                            |
| ------------------------ | ------------------------------------------------------- |
| `npm run dev`            | Vite dev server, browser preview                        |
| `npm run tauri dev`      | Tauri shell with HMR (full desktop iteration loop)      |
| `npm run build`          | `tsc` type-check then `vite build` to `dist/`           |
| `npm run preview`        | Serve the production build locally                      |
| `npm run format`         | Prettier write across `src/**/*.{ts,tsx}`, configs      |
| `npm run tauri`          | Pass-through to `@tauri-apps/cli`                       |

### Development tips

- **Mock data lives in `src/lib/mockData.ts`.** The four partition components
  read `MOCK_CHIP_CONFIG`, `MOCK_DESIGN_CONFIG`, `MOCK_BALL_ISA`, etc. When you
  wire the real `bbdev` CLI bridge (Phase C of the SPEC), replace these
  fixtures with Tauri IPC calls but keep the same TS shape so the components
  don't need to change.
- **Partition switching** uses `DEFAULT_SUB_TABS` in `src/components/constants.ts`.
  Add a new partition there plus a new entry in `LeftDrawerNav` and the
  `Home` page's switch.
- **Atoms** (`src/atoms/`) hold cross-component state (current workspace,
  selected partition, agent conversation). Components stay presentational.
- **Adding Shadcn components**: edit `components.json` then copy the source
  into `src/components/ui/` — we don't run the Shadcn CLI because the agent
  mode is offline-first.
- **Custom title bar**: `TitleBar.tsx` is draggable; window controls delegate
  to Tauri's `getCurrentWindow()` API. Theme switch and hamburger menu live
  here so the system menubar stays clean.
- **Mobile vs desktop layout**: `<768px` collapses the menubar into a hamburger
  Sheet; `use-mobile()` hook drives this.
- **i18n**: strings go through `useT(key)`; add new keys to both `zh-CN` and
  `en` tables in `src/lib/i18n.ts`.

### Where this is heading (SPEC §12)

- **Phase B (current)** — Visual editing of TOML configs across chip / design /
  ball / sim, driven by mock data.
- **Phase C** — Tauri shell calls into `bbdev` (verilator, workload, uvm,
  firesim), streaming logs into the right panel.
- **Phase D** — `bbdev/mcp` integration in `AgentPanel.tsx`, so the AI agent
  can edit configs and run commands under explicit user confirmation.

### Contributing

- Keep individual files under ~500 LoC; split when a module starts to grow.
  See `ecos/AGENTS.md` for full coding rules.
- Type-check before publishing: `npx tsc --noEmit`.
- Validate visible UI changes at common desktop sizes; attach a screenshot or
  short recording to the PR.
- Don't commit `node_modules/`, `dist/`, `src-tauri/target/`, `*.lockb`,
  `.env`, or generated package resources.

### License

TBD — see the parent repository's `LICENSE` once published.

---

<a id="简体中文"></a>

## 简体中文

**BBOS GUI** 是 [BBOS](../) 的桌面端。它把 [`bbdev`](../../../) 命令行包成可视
化工作台，让新用户从「能跑通」到「能改通」的时间从一周缩短到一天（SPEC §1.2）。

### 项目内容

`src/pages/Home.tsx` 是整个应用唯一的入口页，按 SPEC §6 Phase B 划分为四
个主分区：

| 分区       | 组件                | 作用                                   |
| ---------- | ------------------- | -------------------------------------- |
| **chip**   | `ChipEditor`        | 芯片级 TOML 配置（单一事实源）         |
| **design** | `DesignEditor`      | 硬件设计工作台                         |
| **ball**   | `BallISAEditor`     | Ball ISA 指令与 ISA 级设置             |
| **sim**    | `Simulator`         | Verilator / Spike / VCS / FireSim 跑仿真 |

外围组件：`AppHeader`、`LeftDrawerNav`、`RightPanel`、`TitleBar`、
`AgentPanel`、`Explorer`、`mode-toggle`（明 / 暗 / 跟随系统）、自定义
toast（sonner），以及 `useT` + `lib/i18n` 组成的中英文 i18n 栈。

### 技术栈

| 层        | 选型                                                               |
| --------- | ------------------------------------------------------------------ |
| 外壳      | **Tauri 1**（Rust，`src-tauri/`）                                  |
| UI 运行时 | **React 18** + **TypeScript 5**                                    |
| 打包      | **Vite 5**（`@vitejs/plugin-react`）                               |
| 样式      | **Tailwind CSS 3** + 基于 Radix 的 Shadcn UI                       |
| 状态      | **Jotai** atoms（`src/atoms/`）                                    |
| 表单 / 数据 | `react-hook-form`、`zod`、`@tanstack/react-table`、`recharts`     |
| 国际化    | `src/lib/i18n.ts` 自研（`zh-CN` + `en`）                           |
| 工具链    | Prettier 3、`tsc --noEmit`、Tailwind typography                    |

### 目录结构

参见上方 English 章节的目录树说明——中英双语文档同一棵树。

### 环境准备

- Node.js **18+**
- Rust 工具链（stable）——Tauri 必需
- 各平台 Tauri 依赖见 <https://tauri.app/start/prerequisites/>
  - **Windows**：WebView2 + MSVC
  - **macOS**：Xcode 命令行工具
  - **Linux**：`webkit2gtk`、`libssl` 等

### 安装与启动

```bash
cd bbos/gui
npm install           # 或 pnpm install / bun install

npm run dev           # 仅网页预览（Vite）
npm run tauri dev     # 启动桌面 App 并开启 HMR
```

首次 `npm run tauri dev` 会编译 Rust 端，需要耐心等待；之后增量很快。

### 可用脚本

| 命令                   | 说明                                              |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Vite 开发服务器，浏览器预览                       |
| `npm run tauri dev`    | Tauri 桌面外壳 + HMR（完整桌面开发循环）          |
| `npm run build`        | `tsc` 类型检查 + `vite build` 产物到 `dist/`      |
| `npm run preview`      | 本地预览生产构建                                  |
| `npm run format`       | Prettier 写入 `src/**/*.{ts,tsx}` 及配置文件      |
| `npm run tauri`        | 透传给 `@tauri-apps/cli`                          |

### 开发提示

- **Mock 数据集中在 `src/lib/mockData.ts`**，四个分区组件分别读
  `MOCK_CHIP_CONFIG` / `MOCK_DESIGN_CONFIG` / `MOCK_BALL_ISA` 等。Phase C
  接入真实 `bbdev` CLI 时把这里换成 Tauri IPC 调用即可，TS 类型保持一致，
  上层组件无需改动。
- **分区切换**通过 `src/components/constants.ts` 中的 `DEFAULT_SUB_TABS`
  驱动，新增主分区时同步在 `LeftDrawerNav` 和 `Home` 的 switch 里登记。
- **Atoms**（`src/atoms/`）保存跨组件状态（当前 workspace、选中分区、
  Agent 会话），组件保持纯展示。
- **新增 Shadcn 组件**：编辑 `components.json`，然后把源码复制到
  `src/components/ui/`——不跑 Shadcn CLI，因为 agent 模式离线优先。
- **自定义标题栏**：`TitleBar.tsx` 可拖拽，窗口控制委托给 Tauri 的
  `getCurrentWindow()` API。主题切换和汉堡菜单也放在这里，避免污染系统
  菜单。
- **响应式布局**：`<768px` 把 menubar 折叠为汉堡 Sheet，由 `use-mobile()`
  hook 驱动。
- **i18n**：文案统一通过 `useT(key)` 取用；新增 key 时在
  `src/lib/i18n.ts` 的 `zh-CN` 和 `en` 表里同时登记。

### 下一步规划（SPEC §12）

- **Phase B（当前）**：chip / design / ball / sim 四区 TOML 可视化编辑，
  数据来自 mock。
- **Phase C**：Tauri 调用 `bbdev`（verilator、workload、uvm、firesim），
  日志流式推到右侧面板。
- **Phase D**：在 `AgentPanel.tsx` 接入 `bbdev/mcp`，AI Agent 在用户显式
  确认后可改配置、跑命令。

### 贡献

- 单文件控制在 ~500 行以内，模块增长就拆。完整编码规范见
  `ecos/AGENTS.md`。
- 发布前先跑 `npx tsc --noEmit` 做类型检查。
- 可见 UI 改动请在常见桌面分辨率下验证，并在 PR 中附截图或短录屏。
- 不要提交 `node_modules/`、`dist/`、`src-tauri/target/`、`*.lockb`、
  `.env` 以及生成的打包资源。

### 许可证

待定——以父仓库正式发布时的 `LICENSE` 为准。
