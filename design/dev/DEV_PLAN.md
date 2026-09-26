# BBOS 开发计划

**项目**: BBOS — Buckyball Desktop IDE
**版本**: v1.1（基于 Web 原型重写）
**日期**: 2026-09-25
**状态**: Web 原型已完成，进入桌面化与集成阶段

---

## 1. 项目概述

### 1.1 目标

BBOS 是一个面向 Buckyball DSA 开发框架的**桌面 IDE**，为硬件/系统开发者提供可视化、可交互的工作环境。

### 1.2 核心价值

| 价值 | 说明 |
|------|------|
| **降低门槛** | 不需要记忆 bbdev CLI 参数，点点鼠标就能完成仿真 |
| **可视化编辑** | Chip / Design / Ball ISA 配置直接图形化编辑，无需手动改 TOML |
| **AI 辅助开发** | 内置 Agent 助手（Claude/Codex/Gemini），随时解答配置问题、生成代码建议 |
| **结果可视化** | 追踪数据、波形、性能报告以图形方式呈现 |
| **随时待命** | 最小化到系统托盘，后台运行仿真，完成后通知 |
| **国际化** | 中英文双语切换，覆盖国内/海外用户 |

### 1.3 与现有系统的关系

```
┌─────────────────────────────────────────────────────────────┐
│                      BBOS (Desktop IDE)                     │
│                   面向人类用户的图形化界面                    │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              │ 调用
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  bbdev (CLI + Motia API) + bbdev/mcp (AI Agent 接口)       │
│              面向 AI Agent 的命令行接口                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              │ 执行
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  bebop (Rust 仿真框架) + arch (Scala/Chisel) + verify (UVM) │
│                    底层实现系统                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 当前进度（2026-09-25）

### 2.1 已完成（Web 原型）

> ✅ **前端原型已全部实现于 `frontend/index.html`（2063 行，自包含 HTML + CSS + 完整 React 应用代码）**

| 模块 | 状态 | 说明 |
|------|------|------|
| **三栏式布局** | ✅ 完成 | 左抽屉 + 中心内容 + 右可折叠面板（Explorer + Agent） |
| **顶部导航** | ✅ 完成 | Logo + 应用名 + 语言切换 + 设置入口 |
| **i18n（中英文）** | ✅ 完成 | `translations.zh` / `translations.en`，全量文案覆盖 |
| **明暗主题** | ✅ 完成 | Codex Light + Dark，自动适配 `prefers-color-scheme` |
| **Chip Editor** | ✅ 完成 | 三卡片：Design Include / Simulation Targets / UVM Config |
| **Design Editor** | ✅ 完成 | Top Config + Tile 卡片网格（参数可编辑） |
| **Ball ISA Editor** | ✅ 完成 | 指令表格 + 模糊搜索 + Ball 筛选 + 计数 |
| **Simulator** | ✅ 完成 | Chip/Sim/Binary 三选 + Run/Stop + 暗色终端 + 快捷命令 |
| **AI Assistant** | ✅ 完成 | 右面板 Chat 模式，支持 Claude/Codex/Gemini、quick hints、思考动画 |
| **Explorer** | ✅ 完成 | 文件树（自动展开前两级）+ 文件搜索 |
| **图标系统** | ✅ 完成 | 23+ Lucide 风格内联 SVG 图标 |
| **基础组件库** | ✅ 完成 | Button/Input/Select/Badge/Card/Divider/TreeView |

**前端栈选择**：纯 HTML + React 18（CDN UMD）+ Babel Standalone（JSX 编译）
- **优势**：零构建、双击即可运行、易于演示与分享
- **劣势**：生产环境下应迁移到 Vite + 模块化项目

### 2.2 模拟数据结构

| 数据 | 当前位置 | 真实数据路径 |
|------|----------|--------------|
| `MOCK_PROJECT.structure` | `index.html` 内 | `examples/` 文件树 |
| `MOCK_CHIP_CONFIG` | `index.html` 内 | `examples/chips/toy/configs/chip.toml` |
| `MOCK_DESIGN_CONFIG` | `index.html` 内 | `examples/chips/toy/configs/designs/toy.toml` |
| `MOCK_BALL_ISA` | `index.html` 内 | `examples/balls/*/balldomains/*.toml` |
| `SIMULATION_TEMPLATES` | `index.html` 内 | bbdev CLI 子命令列表 |
| `BBDEV_COMMANDS` | `index.html` 内 | 4 个常用快捷命令 |

---

## 3. 技术架构

### 3.1 当前架构（Web 原型）

```
frontend/index.html（自包含）
├── <style>                  # 全局 CSS 变量 + 主题
│   ├── CSS Custom Properties
│   ├── 暗色模式 (@media)
│   ├── 滚动条 / 选择 / 动画
│   └── 代码字体
├── <script> React/ReactDOM/Babel (CDN UMD)
└── <script type="text/babel">  # React 应用
    ├── i18n 模块 (translations, LanguageContext)
    ├── 常量与 Mock 数据
    ├── 图标库 (Icons, 23+ SVG)
    ├── 基础组件 (Button/Input/Select/Badge/Card/Divider)
    ├── 业务组件
    │   ├── TreeView/TreeItem
    │   ├── ChipEditor
    │   ├── DesignEditor
    │   ├── BallISAEditor
    │   ├── Simulator
    │   ├── AgentPanelContent
    │   ├── LeftDrawerNav
    │   └── RightPanel
    └── App + render
```

### 3.2 目标架构（桌面应用，待落地）

```
┌─────────────────────────────────────────────────────────────┐
│  Tauri 主进程 (Rust)                                         │
│  ├── 文件系统命令：scan / read / write TOML                  │
│  ├── 进程管理：spawn bbdev / track PID / signal              │
│  ├── 系统托盘：minimize / notify / restore                   │
│  ├── 进程间桥接：HTTP/stdio ↔ MCP                           │
│  └── 通知：完成 / 失败 / 长时间无响应                        │
└──────────────────┬──────────────────────────────────────────┘
                   │ IPC (tauri::command)
┌──────────────────┴──────────────────────────────────────────┐
│  渲染进程 (WebView)                                          │
│  ├── index.html（已有） → 迁移为 React/Vite 模块化项目       │
│  ├── 业务组件（已有）→ 1:1 迁移到 gui/src/                   │
│  ├── 状态管理：Zustand（替换 mock data）                     │
│  ├── 数据层：tRPC/REST 客户端（调用 bbdev API）              │
│  └── AI 客户端：fetch bbdev/mcp                             │
└─────────────────────────────────────────────────────────────┘
                   │
                   │ HTTP / Motia / MCP
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  bbdev CLI + bbdev/mcp                                      │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 推荐技术栈（迁移到 Tauri 时）

| 层次 | 选型 | 理由 |
|------|------|------|
| **桌面框架** | Tauri v2 | 复用前端代码、跨平台、安装包小 |
| **前端构建** | Vite + React 18 + TypeScript | 模块化、类型安全、与原型 1:1 映射 |
| **状态管理** | Zustand | 轻量、TypeScript 友好、模板代码少 |
| **样式** | 原型已用 CSS Custom Properties，可保留或迁移到 Tailwind | 选择保留以减少迁移工作量 |
| **后端** | Rust (Tauri 原生) | 与 BBOS 主项目技术栈一致 |
| **进程管理** | tokio::process | 异步启动/管理 bbdev 子进程 |
| **TOML 解析** | toml + serde | Rust 官方生态、保留注释 |

---

## 4. 开发阶段（v1.1）

### Phase A：Web 原型 ✅ 已完成（2026-09-25 之前）

**目标**：完成可演示的 Web 原型

**交付物**：
- ✅ `frontend/index.html`（2063 行，自包含）
- ✅ 完整三栏布局
- ✅ 四个核心编辑器（Chip / Design / Ball ISA / Simulator）
- ✅ AI Assistant 面板
- ✅ 中英文双语 + 暗色主题

**复用说明**：所有已实现的 React 组件（`Button` / `ChipEditor` / `DesignEditor` / `BallISAEditor` / `Simulator` / `AgentPanelContent` / `LeftDrawerNav` / `RightPanel`）将以 1:1 方式迁移到 `gui/src/` 下的模块化组件。

---

### Phase B：模块化与类型化（预计 1.5 天）

**目标**：将自包含原型拆分为 Vite + TypeScript 模块化项目

**任务清单**：

| # | 任务 | 描述 | 依赖 | 状态 |
|---|------|------|------|------|
| B.1 | 初始化 Vite + React + TS 项目 | `npm create vite@latest gui -- --template react-ts` | - | ☐ |
| B.2 | 安装运行时依赖 | react、@tauri-apps/api（未来用） | B.1 | ☐ |
| B.3 | 迁移全局样式 | `<style>` → `src/styles/global.css` + `theme.css` | A | ☐ |
| B.4 | 迁移图标库 | `Icons` → `src/components/ui/Icons.tsx`（23+ SVG） | A | ☐ |
| B.5 | 迁移基础组件 | Button/Input/Select/Badge/Card/Divider → `src/components/ui/` | B.4 | ☐ |
| B.6 | 迁移 i18n 模块 | translations + LanguageContext → `src/lib/i18n.ts` + `src/contexts/LanguageContext.tsx` | - | ☐ |
| B.7 | 迁移业务组件 | TreeView / ChipEditor / DesignEditor / BallISAEditor / Simulator / AgentPanelContent / LeftDrawerNav / RightPanel → `src/components/` | B.5, B.6 | ☐ |
| B.8 | 添加 TypeScript 类型 | 为所有组件 props 与 mock 数据添加类型 | B.7 | ☐ |
| B.9 | 配置 ESLint + Prettier | 统一代码风格 | B.1 | ☐ |
| B.10 | 验证构建 | `npm run dev` 与原型行为一致 | B.7 | ☐ |

**验收标准**：
- [ ] `npm run dev` 启动后所有功能与原型一致
- [ ] 所有组件具备 TypeScript 类型
- [ ] ESLint 0 errors

---

### Phase C：数据层接入（预计 2 天）

**目标**：用真实数据替换 Mock 数据

**任务清单**：

| # | 任务 | 描述 | 依赖 | 状态 |
|---|------|------|------|------|
| C.1 | 定义数据模型 | `src/types/`：ChipConfig、DesignConfig、BallISA、TreeNode 等 | B.8 | ☐ |
| C.2 | 实现 WorkspaceStore | Zustand store：当前工作区路径、文件树、选中文件 | C.1 | ☐ |
| C.3 | 实现 ChipStore | 当前 chip.toml 数据 + 加载/保存方法 | C.1, C.2 | ☐ |
| C.4 | 实现 DesignStore | 当前 designs/*.toml 数据 + 加载/保存方法 | C.1, C.2 | ☐ |
| C.5 | 实现 BallStore | Ball ISA 指令列表 + 增删改 | C.1, C.2 | ☐ |
| C.6 | 实现 SimStore | 当前选中的 Chip/Sim/Binary + 日志流 | C.1 | ☐ |
| C.7 | 实现 AgentStore | Agent 选择、消息历史、思考状态 | C.1 | ☐ |
| C.8 | 接入 Tauri 文件命令 | `scanDirectory` / `readFile` / `writeFile` / `parseToml` / `serializeToml` | C.2 | ☐ |
| C.9 | 替换 Mock 数据 | 各组件从 Store 读取而非直接 import MOCK_* | C.3-C.7 | ☐ |
| C.10 | 实现保存反馈 | 写入成功显示 "已保存" Badge | C.9 | ☐ |

**Rust 命令接口**：

```rust
// src-tauri/src/commands.rs

#[tauri::command]
fn scan_directory(path: String) -> Result<Vec<TreeNode>, String>;

#[tauri::command]
fn read_file(path: String) -> Result<String, String>;

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String>;

#[tauri::command]
fn parse_toml(content: String) -> Result<toml::Value, String>;

#[tauri::command]
fn serialize_toml(value: toml::Value) -> Result<String, String>;
```

**验收标准**：
- [ ] 选择工作区后正确显示真实文件树
- [ ] Chip / Design / Ball ISA 编辑器可加载真实 TOML
- [ ] 编辑后保存到磁盘，刷新页面数据持久
- [ ] 错误（路径不存在、TOML 解析失败）有友好提示

---

### Phase D：仿真与进程管理（预计 2 天）

**目标**：接入 bbdev 子进程，实时显示仿真日志

**任务清单**：

| # | 任务 | 描述 | 依赖 | 状态 |
|---|------|------|------|------|
| D.1 | Rust 命令：探测 bbdev | `detect_bbdev()` 检查 PATH 中的 bbdev | - | ☐ |
| D.2 | Rust 命令：运行 bbdev | `run_bbdev(args: Vec<String>)` 异步启动子进程 | D.1 | ☐ |
| D.3 | Rust 命令：停止仿真 | `stop_simulation(task_id)` 终止进程 | D.2 | ☐ |
| D.4 | Rust 命令：获取状态 | `get_simulation_status(task_id)` 返回 running/exit_code | D.2 | ☐ |
| D.5 | 前端：替换 mock 日志流 | 订阅 `tauri event` → 实时 append 到 SimStore | D.2 | ☐ |
| D.6 | 前端：异步运行按钮 | Run/Stop 切换正确触发生命周期 | D.2, D.3 | ☐ |
| D.7 | 前端：进度显示 | 解析 bbdev 输出中的 `[Progress: XX%]` | D.5 | ☐ |
| D.8 | 前端：快捷命令 | 4 个 BBDEV_COMMANDS 按钮调用对应 bbdev 子命令 | D.2 | ☐ |
| D.9 | 错误处理 | bbdev 不可用 / 启动失败 / 超时 | D.1, D.2 | ☐ |
| D.10 | 日志持久化 | 仿真结束后保存日志到 `~/.bbos/logs/<task>.log` | D.2 | ☐ |

**Rust 进程管理结构**：

```rust
// src-tauri/src/process.rs
pub struct SimulationProcess {
    child: Option<tokio::process::Child>,
    stop_tx: tokio::sync::broadcast::Sender<()>,
    task_id: String,
}

impl SimulationProcess {
    pub async fn start(args: Vec<String>, event_tx: tauri::Emitter) -> Result<String, String>;
    pub async fn stop(&mut self) -> Result<(), String>;
    pub fn status(&self) -> SimulationStatus;
}
```

**验收标准**：
- [ ] 在 bbos/gui 目录运行可启动 `bbdev verilator --run` 等命令
- [ ] 实时显示 bbdev stdout/stderr
- [ ] Stop 按钮正确终止进程
- [ ] bbdev 不在 PATH 时显示安装提示

---

### Phase E：AI Agent 集成（预计 1.5 天）

**目标**：右侧 Agent 面板真正调用 bbdev/mcp

**任务清单**：

| # | 任务 | 描述 | 依赖 | 状态 |
|---|------|------|------|------|
| E.1 | Rust 命令：探测 MCP | `detect_bbdev_mcp()` | - | ☐ |
| E.2 | Rust 命令：MCP 请求 | `mcp_request(agent_id, messages)` 转发到 bbdev/mcp | E.1 | ☐ |
| E.3 | Rust 命令：MCP 流式响应 | 支持 SSE / streaming | E.2 | ☐ |
| E.4 | 前端：替换 mock 对话 | AgentStore → 真实 MCP 请求 | E.2 | ☐ |
| E.5 | 前端：streaming 渲染 | 流式返回的 token 增量追加到消息 | E.3 | ☐ |
| E.6 | 前端：上下文注入 | 根据当前 Tab 注入 chip/design/ball/sim 上下文 | C.* | ☐ |
| E.7 | 前端：quick hints 真实化 | hints 来自 bbdev/mcp 工具列表，而非硬编码 | E.4 | ☐ |
| E.8 | Agent 切换 | Claude/Codex/Gemini 切换真实生效 | E.4 | ☐ |

**验收标准**：
- [ ] 在右侧面板输入消息后真正调用 MCP 后端
- [ ] 流式响应正确渲染
- [ ] 切换 Agent 后消息历史隔离

---

### Phase F：桌面集成（预计 1.5 天）

**目标**：系统托盘、窗口控制、通知

**任务清单**：

| # | 任务 | 描述 | 依赖 | 状态 |
|---|------|------|------|------|
| F.1 | 系统托盘 | 最小化到托盘、托盘菜单、点击恢复 | - | ☐ |
| F.2 | 关闭窗口行为 | 关闭按钮最小化到托盘而非退出 | F.1 | ☐ |
| F.3 | 通知 | 仿真完成 / 失败时弹系统通知 | D.2 | ☐ |
| F.4 | 开机自启 | 设置项可勾选 | F.1 | ☐ |
| F.5 | 全局快捷键 | Ctrl+Shift+B 显示/隐藏主窗口 | F.1 | ☐ |
| F.6 | 窗口尺寸记忆 | 上次的窗口位置与尺寸 | - | ☐ |

**验收标准**：
- [ ] 关闭主窗口后进程仍在托盘运行
- [ ] 后台仿真完成时弹通知
- [ ] 第二次启动恢复上次窗口位置

---

### Phase G：结果可视化（预计 2 天）

**目标**：追踪数据、波形查看、性能报告

**任务清单**：

| # | 任务 | 描述 | 依赖 | 状态 |
|---|------|------|------|------|
| G.1 | Rust 命令：扫描追踪文件 | `list_traces()` 列出 `.ndjson` 追踪 | D.2 | ☐ |
| G.2 | 前端：结果列表 | 仿真历史 + 时间 + 退出码 + 时长 | G.1 | ☐ |
| G.3 | 前端：摘要卡片 | 退出码、耗时、周期数 | G.1 | ☐ |
| G.4 | 前端：iTrace 可视化 | 指令追踪表格 | G.1 | ☐ |
| G.5 | 前端：mTrace 可视化 | 内存访问追踪 | G.1 | ☐ |
| G.6 | 前端：banktrace 可视化 | Bank 冲突追踪 | G.1 | ☐ |
| G.7 | 波形集成 | 检测并打开 .vcd（外部工具 / Surfer） | G.1 | ☐ |
| G.8 | Perfetto 集成 | 生成 perfetto URL | G.1 | ☐ |

**验收标准**：
- [ ] 仿真结束后自动列出追踪文件
- [ ] 追踪数据正确展示
- [ ] 一键打开波形查看器

---

### Phase H：收尾与发布（预计 1 天）

**目标**：完善细节、打包发布

**任务清单**：

| # | 任务 | 描述 | 依赖 | 状态 |
|---|------|------|------|------|
| H.1 | 设置页面 | 工作区路径 / 主题 / Agent 选择 / 快捷键 | B | ☐ |
| H.2 | 快捷键 | Ctrl+S 保存 / Ctrl+Enter 发送消息 / Ctrl+B 切换面板 | B-F | ☐ |
| H.3 | 错误处理统一 | 全部 Tauri 命令包装 Result + 前端 toast | C-G | ☐ |
| H.4 | 加载状态 | 全局 Loading indicator | B-G | ☐ |
| H.5 | 文档 | README / 用户手册 / CHANGELOG | - | ☐ |
| H.6 | 打包发布 | Windows / macOS / Linux 安装包 | F | ☐ |
| H.7 | 暗色主题优化 | 终端 / 表格细节 | B | ☐ |
| H.8 | 性能优化 | 减少重渲染、懒加载 | all | ☐ |

---

## 5. 里程碑

| 里程碑 | 包含阶段 | 预计时间 | 交付内容 |
|--------|----------|----------|----------|
| **M0: Web 原型** | A | 0 | 已完成 ✅ |
| **M1: 模块化** | B | 1.5 天 | Vite + TS 项目，组件 1:1 迁移 |
| **M2: 数据层** | B + C | 3.5 天 | 真实 TOML 读写、Store 体系 |
| **M3: 仿真集成** | + D | 5.5 天 | 真实 bbdev 子进程 + 实时日志 |
| **M4: Agent 集成** | + E | 7 天 | 真实 MCP 调用 |
| **M5: 桌面化** | + F | 8.5 天 | 托盘 / 通知 / 快捷键 |
| **M6: 结果可视化** | + G | 10.5 天 | 追踪 / 波形 / Perfetto |
| **M7: 发布** | + H | 11.5 天 | 打包 / 安装程序 |

**总预计时间**：约 11.5 个工作日（M1 之后）

---

## 6. 现有组件迁移清单（从原型 → 模块化项目）

| 原型位置（`frontend/index.html`） | 目标位置（`gui/src/`） | 迁移策略 |
|------|------|------|
| `Icons` 对象 | `components/ui/Icons.tsx` | 提取为命名导出 |
| `Button` 组件 | `components/ui/Button.tsx` | 加 TypeScript props |
| `Input` 组件 | `components/ui/Input.tsx` | 加 TypeScript props |
| `Select` 组件 | `components/ui/Select.tsx` | 加 TypeScript props |
| `Badge` 组件 | `components/ui/Badge.tsx` | 加 TypeScript props |
| `Card` 组件 | `components/ui/Card.tsx` | 加 TypeScript props |
| `Divider` 组件 | `components/ui/Divider.tsx` | 加 TypeScript props |
| `translations` | `lib/i18n.ts` | 类型化 Key + 翻译表 |
| `LanguageContext` | `contexts/LanguageContext.tsx` | 提取 Provider/Hook |
| `TreeView`/`TreeItem` | `components/TreeView.tsx` | 加类型 |
| `ChipEditor` | `components/editors/ChipEditor.tsx` | 加类型 + 接入 Store |
| `DesignEditor` | `components/editors/DesignEditor.tsx` | 加类型 + 接入 Store |
| `BallISAEditor` | `components/editors/BallISAEditor.tsx` | 加类型 + 接入 Store |
| `Simulator` | `components/Simulator.tsx` | 接入真实 bbdev |
| `AgentPanelContent` | `components/AgentPanel.tsx` | 接入真实 MCP |
| `LeftDrawerNav` | `components/layout/LeftDrawerNav.tsx` | 加类型 |
| `RightPanel` | `components/layout/RightPanel.tsx` | 加类型 |
| `App` | `App.tsx` | 顶层组件 |
| `MOCK_*` 数据 | `lib/mock-data.ts`（开发用）+ `types/` | 保留供离线开发 |
| `<style>` 块 | `styles/global.css` + `styles/theme.css` | 拆分 |

---

## 7. 每日开发任务模板

```markdown
## Day X: YYYY-MM-DD

### 今日目标
- [ ] 任务 1
- [ ] 任务 2

### 完成情况
- [x] 任务 1 - 完成描述
- [ ] 任务 2 - 未完成原因

### 遇到的问题
- 问题描述及解决方案

### 明日计划
- [ ] 任务 3
- [ ] 任务 4
```

---

## 8. 参考资料

| 文件 | 内容 |
|------|------|
| `../SPEC.md` | BBOS 总体规格书 |
| `../PROJECT_ANALYSIS.md` | Buckyball 项目分析 |
| `../frontend/index.html` | Web 原型（完整实现） |
| `../frontend/UI_REFERENCE.md` | UI 视觉参考 |

---

## 9. 变更记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-09-24 | v1.0 | 初稿，基于 Tauri + React + shadcn/ui 假设 |
| 2026-09-25 | v1.1 | 基于已完成 Web 原型重写，标记 Phase A 已完成，剩余阶段 B-H |
| 2026-09-25 | v1.2 | 追加 §10 骨架审计：`bbos/gui/` 当前是未填充的 Tauri v1 + React + Shadcn 模板，未对齐 v1.1 规划 |

---

## 10. 骨架审计：`bbos/gui/` 当前状态

> 本节作为对 §3.2 目标架构与 §4 Phase B 任务清单的**实地核查**。骨架来自 `bbos/gui/` 目录的当前文件，结论与原规划存在若干偏差，需在 Phase B 启动前明确处置策略。

### 10.1 顶层文件清单（排除 `node_modules/`、`src-tauri/target/`）

```
bbos/gui/
├── .claude/settings.local.json        # Claude 桌面权限（非工程文件）
├── .vscode/extensions.json            # 推荐 tauri-vscode / rust-analyzer
├── .gitignore                         # 标准 Node + Tauri 忽略项
├── .prettierrc.json                   # printWidth 80, double quote
├── README.md                          # ⚠️ 原模板 "Project Wind" 文档
├── bun.lock                           # bun 锁文件
├── components.json                    # shadcn 配置 (new-york, neutral, lucide)
├── index.html                         # Vite 入口，挂载 #root
├── package.json                       # 名称 "agent-desktop"，版本 2.1.0
├── package-lock.json                  # 同时存在 npm lockfile
├── postcss.config.js                  # tailwindcss + autoprefixer
├── tailwind.config.js                 # 标准 shadcn CSS Variables 主题
├── tsconfig.json                      # strict + paths "@/*" -> "./src/*"
├── tsconfig.node.json                 # 仅包含 vite.config.ts
├── vite.config.ts                     # 端口 1420, strictPort, 忽略 src-tauri
├── public/
│   ├── tauri.svg
│   └── vite.svg
├── src/                               # ⚠️ 仅脚手架，业务代码几乎为零
│   ├── main.tsx                       # 直接 render <Welcome />（不存在）
│   ├── styles.css                     # Tailwind 三层 + CSS Variables 主题
│   ├── vite-env.d.ts
│   ├── assets/                        # 空
│   ├── atoms/                         # 空（jotai atom 占位）
│   ├── components/                    # 空（应含 ui/、editors/、layout/）
│   ├── hooks/                         # 空
│   ├── layouts/                       # 空
│   ├── lib/                           # 空
│   └── pages/                         # 空（Welcome 缺失，main.tsx 会编译失败）
└── src-tauri/                         # ⚠️ Tauri v1，不是规划的 v2
    ├── .gitignore
    ├── build.rs                       # 仅 tauri_build::build()
    ├── Cargo.toml                     # 包名 "markdown-editor"（遗留模板名）
    ├── Cargo.lock
    ├── tauri.conf.json                # productName "gui", identifier "com.yourname.agentdesktop"
    ├── icons/                         # 完整图标集
    └── src/main.rs                    # 模板 greet 命令 + 系统托盘
```

### 10.3 当前可立即运行的最短路径

```bash
cd bbos/gui
bun install                 # 已生成 node_modules
# src/main.tsx 引用了 @/pages/Welcome，但该文件缺失
# 直接 npm run dev 会在 import 阶段失败
```
### 10.4 后续动作建议（按优先级）

1. **【必须 · 阻塞】** 实现最小 `src/pages/Welcome.tsx`（可暂时只渲染 `<h1>BBOS</h1>`），让骨架可启动可构建。
2. **【必须】** 统一 `package.json` / `tauri.conf.json` / `Cargo.toml` 的命名（见 §10.2 表）。
3. **【必须】** 删除上游模板 `README.md`，替换为 BBOS README（指向 `design/SPEC.md` / `design/dev/DEV_PLAN.md`）。
4. **【必须】** 选定单锁文件，删除另一个。
5. **【决策】** 决定 Tauri 主版本（v1 留 / 升 v2），并把决策写进 §3.3。
6. **【决策】** 决定状态管理（jotai 已装 / 改 zustand），并更新 §3.3。
7. **【阶段内】** 按 §6 清单将 `frontend/index.html` 的组件 1:1 迁入 `src/`，并按 §4.B 推进其余任务。
8. **【阶段内】** 用 `npx shadcn@latest add` 按需补齐 `components/ui/`，不要手写 shadcn 组件。
9. **【阶段内】** `src-tauri/src/main.rs` 的模板 greet / 系统托盘代码保留作为基线，按 §4.C/D/F 增量添加业务命令。

### 10.5 与本节相关的引用

- §3.2 目标架构、§3.3 推荐技术栈、§4 阶段任务清单、§6 组件迁移表 — 全部需要按本节偏差表复核更新。
- `../frontend/index.html` — 业务组件的当前真实来源。
- `../frontend/UI_REFERENCE.md` — 视觉规范来源，迁移时一并参照。