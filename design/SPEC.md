# BBOS 总体规格书

**项目**: BBOS — Buckyball Desktop IDE
**版本**: v1.0
**日期**: 2026-09-25
**状态**: Web 原型已落地，规格书冻结待实施

---

## 目录

1. [项目背景与目标](#1-项目背景与目标)
2. [产品定位](#2-产品定位)
3. [用户角色与场景](#3-用户角色与场景)
4. [技术架构](#4-技术架构)
5. [功能规格](#5-功能规格)
6. [UI/UX 规格](#6-uiux-规格)
7. [数据模型](#7-数据模型)
8. [国际化](#8-国际化)
9. [集成接口](#9-集成接口)
10. [性能与质量](#10-性能与质量)
11. [安全与权限](#11-安全与权限)
12. [路线图与里程碑](#12-路线图与里程碑)
13. [附录](#13-附录)

---

## 1. 项目背景与目标

### 1.1 背景

Buckyball 是一个开源的**领域特定架构 (DSA) 敏捷开发框架**，提供从硬件描述、仿真、验证到部署的全流程能力。当前开发者使用 **bbdev CLI** 完成日常任务：

```bash
bbdev verilator --run '--jobs 16 --chip toy --binary toy-toy-vecunit_matmul_ones-baremetal --batch'
bbdev workload --build --chip toy --workload matmul
bbdev uvm --build --test blink_test
```

CLI 命令冗长、参数繁多、不直观，新手难以快速上手。BBOS 即是为 Buckyball 设计的**桌面 IDE**，将 CLI 能力转换为可视化操作。

### 1.2 目标

| 目标 | 度量 |
|------|------|
| **降低门槛** | 新用户从"能跑通"到"能改通"耗时从 1 周降到 1 天 |
| **可视化编辑** | TOML 配置 100% 可视化、所见即所得 |
| **AI 辅助** | 任意时刻可在 IDE 内提问 |
| **随时待命** | 后台任务不被中断 |
| **多语言** | 中英文双语 |

### 1.3 非目标

- ❌ 不替代命令行（CLI 仍是一等公民）
- ❌ 不做完整的 IDE（只覆盖 Buckyball 工作流）
- ❌ 不做云端服务（本地优先）
- ❌ 不强制 Nix 环境（BBOS 自身可在 Win/Mac/Linux 跑，但底层仿真依赖 Nix）

---

## 2. 产品定位

### 2.1 一句话定位

> **Buckyball 开发者的桌面工作台**——把 CLI 翻译成 GUI、把配置翻译成表单、把日志翻译成图表。

### 2.2 与其他工具的关系

| 工具 | 关系 |
|------|------|
| **bbdev CLI** | BBOS 的**调用对象**。BBOS 不重新实现后端逻辑，只是包装。 |
| **bbdev/mcp** | BBOS 的 AI 后端。Agent 面板调用 MCP 工具。 |
| **VSCode / Cursor** | **互补**而非替代。VSCode 适合写 Scala/Chisel/SV 代码，BBOS 适合配置 TOML / 跑仿真 / 看结果。 |
| **ECOS Studio** | 同类参考。BBOS 借鉴其 Vue + Electron 架构思想，但聚焦 Buckyball。 |
| **Termius / iTerm** | BBOS 自带暗色终端，但用户仍可使用系统终端。 |

### 2.3 差异化

| 维度 | BBOS | ECOS Studio | 通用 IDE (VSCode) |
|------|------|-------------|-------------------|
| 目标硬件 | Buckyball DSA | 通用 EDA | 通用 |
| 配置编辑 | ✅ TOML 表格化 | 部分 | 文本编辑 |
| 仿真面板 | ✅ 三选 + 日志 | ✅ | ❌ |
| AI 集成 | ✅ MCP 多 Agent | ✅ Codex | ✅ Copilot |
| 后端运行时 | Rust/Tauri | Rust/Electron | - |

---

## 3. 用户角色与场景

### 3.1 角色

| 角色 | 占比 | 关注点 |
|------|------|--------|
| **DSA 研究者** | 50% | 快速原型化新 Ball 加速器、调试仿真 |
| **编译器开发者** | 20% | 调整 MLIR pass、查看指令 trace |
| **系统集成者** | 20% | 多 Tile 配置、跨域调试 |
| **学生/新人** | 10% | 学习、跑通示例 |

### 3.2 核心场景

#### 场景 1：跑通 toy 仿真

```
用户: 硬件方向研究生，首次接触 Buckyball
目标: 跑通 examples/chips/toy 的 Verilator 仿真
路径:
  1. 启动 BBOS → 看到欢迎页
  2. 选择工作区 = buckyball 仓库根
  3. 点击 Simulator Tab
  4. Chip = toy, Simulator = Verilator, Binary = matmul_ones（自动从 examples 列举）
  5. 点 Run → 暗色终端开始滚日志
  6. 看到 "[Progress: 100%] Simulation completed"
  7. 系统通知弹出："Toy 仿真完成"
```

#### 场景 2：调整 Tile 数量

```
用户: 想做多 Tile 实验
目标: 把 nTiles 从 1 改到 4
路径:
  1. 进入 Design Editor Tab
  2. Top Config → nTiles = 4
  3. 点 Save → designs/toy.toml 写入磁盘
  4. 切回 Simulator → 重新跑
```

#### 场景 3：添加新 Ball 指令

```
用户: 想加 RELU_V2 指令
目标: 把 RELU_V2 加进 balldomains/gemmini.toml
路径:
  1. 进入 Ball ISA Tab
  2. 搜索框输入 "RELU"
  3. 点 Add Instruction → 弹出编辑对话框
  4. 填入 mnemonic/funct7/ball
  5. 保存 → balldomains/gemmini.toml 写入
```

#### 场景 4：AI 辅助调试

```
用户: 仿真失败，不懂错误
目标: 找出错误原因
路径:
  1. 在右侧 Agent 面板输入"仿真在 Cycle 1024 报错，你能看下吗？"
  2. Agent 调用 bbdev/mcp 工具读取日志
  3. 返回可能原因 + 修复建议
  4. 用户应用建议，重新跑仿真
```

---

## 4. 技术架构

### 4.1 当前架构（Web 原型）

```
frontend/index.html（2063 行，自包含）
│
├── HTML 骨架
│   └── <div id="root">
│
├── <style> 块
│   ├── CSS Custom Properties（主题变量）
│   ├── 暗色模式 (@media prefers-color-scheme: dark)
│   ├── 滚动条 / 选择高亮 / 全局动画
│   └── 代码字体声明
│
├── 外部脚本（CDN UMD）
│   ├── React 18 production
│   ├── ReactDOM 18 production
│   └── Babel Standalone（运行时 JSX 编译）
│
└── <script type="text/babel">
    │
    ├── i18n 模块
    │   ├── translations.zh / translations.en
    │   ├── LanguageContext + useLanguage hook
    │   └── useCallback 优化 t 函数
    │
    ├── 常量与 Mock 数据
    │   ├── MOCK_PROJECT（文件树）
    │   ├── MOCK_CHIP_CONFIG
    │   ├── MOCK_DESIGN_CONFIG
    │   ├── MOCK_BALL_ISA
    │   ├── SIMULATION_TEMPLATES
    │   └── BBDEV_COMMANDS
    │
    ├── 图标库（23+ Lucide 风格内联 SVG）
    │   └── Folder / File / ChevronRight/Down / Play / Square /
    │       Terminal / Save / Settings / Cpu / LayoutGrid /
    │       Circle / Zap / Check / AlertCircle / X / Plus /
    │       Search / Globe / MessageSquare / Send / Copy /
    │       Bot / Sparkles / Trash2 / User / ChevronLeft /
    │       PanelLeft / PanelRight
    │
    ├── 基础组件（UI Primitive）
    │   ├── Button（primary/secondary/ghost/danger 四种 variant）
    │   ├── Input（focused 边框高亮）
    │   ├── Select
    │   ├── Badge（default/success/warning/danger/info）
    │   ├── Card（padding 可关）
    │   └── Divider
    │
    ├── 业务组件（编辑器）
    │   ├── TreeView + TreeItem（递归树）
    │   ├── ChipEditor（chip.toml 三个区块）
    │   ├── DesignEditor（Top + Tile 卡片）
    │   ├── BallISAEditor（表格 + 搜索 + Ball 筛选 + 计数）
    │   ├── Simulator（三选 + 暗色终端 + 快捷命令）
    │   ├── AgentPanelContent（独立 AI 面板，Tab 感知）
    │   ├── LeftDrawerNav（左侧折叠抽屉）
    │   └── RightPanel（右侧可折叠，含 Explorer + Agent Tab）
    │
    └── App 顶层组件 + render
```

### 4.2 目标架构（桌面应用，待 Phase B 起落地）

```
┌─────────────────────────────────────────────────────────────┐
│  Tauri Main Process (Rust)                                  │
│  ├── commands.rs       # 文件、进程、TOML 命令              │
│  ├── process.rs        # bbdev 子进程管理                    │
│  ├── tray.rs           # 系统托盘                            │
│  ├── notify.rs         # 系统通知                            │
│  ├── mcp_client.rs     # MCP 客户端                          │
│  └── window.rs         # 窗口状态持久化                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ tauri::command (IPC)
                           │
┌──────────────────────────┴──────────────────────────────────┐
│  Renderer Process (WebView)                                 │
│  ├── src/                                                    │
│  │   ├── main.tsx                                           │
│  │   ├── App.tsx                                            │
│  │   ├── components/                                        │
│  │   │   ├── ui/          # Button / Input / Select / ...  │
│  │   │   ├── layout/      # LeftDrawerNav / RightPanel     │
│  │   │   ├── editors/     # Chip / Design / BallISA        │
│  │   │   └── views/       # Simulator / Agent / Welcome    │
│  │   ├── stores/          # Zustand stores                  │
│  │   │   ├── workspace.ts # 当前工作区 + 文件树             │
│  │   │   ├── chip.ts      # 当前 chip.toml                  │
│  │   │   ├── design.ts    # 当前 designs/*.toml             │
│  │   │   ├── ball.ts      # Ball ISA 数据                   │
│  │   │   ├── sim.ts       # 仿真状态 + 日志流               │
│  │   │   └── agent.ts     # Agent 消息 + 上下文             │
│  │   ├── contexts/                                          │
│  │   │   └── LanguageContext.tsx                            │
│  │   ├── lib/                                                │
│  │   │   ├── i18n.ts                                       │
│  │   │   ├── tauri.ts      # invoke 包装                    │
│  │   │   └── mock-data.ts  # 离线开发用                     │
│  │   ├── types/           # 全局类型定义                    │
│  │   └── styles/          # CSS 主题与全局                  │
│  └── index.html                                            │
└─────────────────────────────────────────────────────────────┘
                   │
                   │ HTTP / Motia / MCP
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  bbdev CLI  +  bbdev/mcp                                   │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 关键技术决策

| 决策 | 选型 | 理由 |
|------|------|------|
| **前端框架** | React 18 | 原型已用 React，迁移成本最低 |
| **构建工具** | Vite | 启动快、HMR 体验好、生态成熟 |
| **类型系统** | TypeScript strict | 硬件配置易错，强类型能拦住拼写错误 |
| **样式方案** | CSS Custom Properties（保留原型） | 原型已用 CSS 变量，性能好、零依赖 |
| **状态管理** | Zustand | 比 Redux 轻量、比 Context 更可测 |
| **桌面框架** | Tauri v2 | 包体积小、Rust 后端与 BBOS 主栈一致 |
| **进程通信** | tauri::command（同步） + tauri event（流式日志） | 同步简单、事件适合流 |
| **TOML 解析** | toml + serde | Rust 官方、保留注释能力强 |

---

## 5. 功能规格

### 5.1 功能清单

| 模块 | 功能 | 优先级 |
|------|------|--------|
| **布局** | 三栏式（抽屉 + 内容 + 折叠面板） | P0 |
| **布局** | 顶部导航（Logo + 标题 + 语言 + 设置） | P0 |
| **布局** | 主题切换（Light / Dark / Auto） | P0 |
| **Chip Editor** | chip.toml 三区块编辑（Design / Sim / UVM） | P0 |
| **Chip Editor** | 保存到磁盘 + 已保存反馈 | P0 |
| **Design Editor** | Top Config 编辑（nTiles） | P0 |
| **Design Editor** | Tile 卡片（coreDataBytes/xLen/vaddrBits/paddrBits） | P0 |
| **Design Editor** | 添加 / 删除 Tile | P0 |
| **Design Editor** | Tile 可视化网格 | P1 |
| **Ball ISA** | 指令表格 | P0 |
| **Ball ISA** | 模糊搜索（按 mnemonic） | P0 |
| **Ball ISA** | Ball 筛选 | P0 |
| **Ball ISA** | Ball 计数 | P0 |
| **Ball ISA** | 添加 / 编辑指令 | P1 |
| **Simulator** | Chip / Simulator / Binary 三选 | P0 |
| **Simulator** | Run / Stop 按钮 | P0 |
| **Simulator** | 实时日志流（暗色终端） | P0 |
| **Simulator** | 快捷命令（4 个 bbdev 子命令） | P0 |
| **Simulator** | 仿真状态 Badge | P0 |
| **Simulator** | Task ID 显示 | P1 |
| **Explorer** | 文件树（自动展开前两级） | P0 |
| **Explorer** | 文件搜索 | P1 |
| **Explorer** | 文件选中态 | P1 |
| **Explorer** | 新建 / 导入按钮 | P2 |
| **Agent** | Claude / Codex / Gemini 切换 | P0 |
| **Agent** | 消息列表（用户 / 助手气泡） | P0 |
| **Agent** | 输入框 + 发送 | P0 |
| **Agent** | 思考动画（三点 pulse） | P0 |
| **Agent** | 代码块 + 复制 | P0 |
| **Agent** | Quick Hints（基于当前 Tab） | P0 |
| **i18n** | 中文 / English 切换 | P0 |
| **桌面集成** | 系统托盘 | P1 |
| **桌面集成** | 系统通知 | P1 |
| **桌面集成** | 开机自启 | P2 |
| **桌面集成** | 全局快捷键 | P2 |

### 5.2 Chip Editor 详细规格

**输入**：`chip.toml`（解析为 `toml::Value`）

**输出**：编辑后的 `chip.toml`

**UI 结构**：

```
┌────────────────────────────────────────────────────────────┐
│ chip.toml                                              保存 │
│ Chip Configuration                                          │
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🔷 Design Include                                       │ │
│ │ ──────────────                                          │ │
│ │ Design File Path                                        │ │
│ │ ┌──────────────────────────────────────────────────┐   │ │
│ │ │ designs/toy.toml                                  │   │ │
│ │ └──────────────────────────────────────────────────┘   │ │
│ └────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ⏵  Simulation Targets                                  │ │
│ │ ──────────────                                          │ │
│ │ verilator:  [sims.verilator.BuckyballToyVerilatorConfig]│ │
│ │ p2e:        [sims.p2e.P2EToyLinuxConfig              ]  │ │
│ │ firesim:    [sims.firesim.FireSimBuckyballToyConfig   ]  │ │
│ └────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ✓  UVM Configuration                                    │ │
│ │ ──────────────                                          │ │
│ │ Balls: [gemmini] [+]                                    │ │
│ │ IPs:   [axis]    [+]                                    │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**数据模型**：

```typescript
interface ChipConfig {
  designs: { include: string };
  sims: {
    verilator?: string;
    p2e?: string;
    firesim?: string;
    // 其他仿真目标
  };
  uvm?: {
    balls: string[];
    ips: string[];
  };
}
```

### 5.3 Design Editor 详细规格

**输入**：`designs/<name>.toml`

**UI 结构**：

```
┌────────────────────────────────────────────────────────────┐
│ Design Configuration                                  保存 │
│ Tile and Core Layout                                        │
├────────────────────────────────────────────────────────────┤
│ ┌── Top Configuration ──────────────────────────────────┐  │
│ │ ⚙  Number of Tiles:  [   1   ]                        │  │
│ └────────────────────────────────────────────────────────┘ │
│ Tiles                                       [ + Add Tile ]  │
│ ┌── Tile 0 ─────────────┐  ┌── Tile 1 ─────────────┐      │
│ │ 🟢 active              │  │ 🟢 active              │      │
│ │ ID: 0                  │  │ ID: 1                  │      │
│ │ ─────                  │  │ ─────                  │      │
│ │ Core Data (B): [64]    │  │ Core Data (B): [64]    │      │
│ │ XLEN:         [64]     │  │ XLEN:         [64]     │      │
│ │ VAddr Bits:   [39]     │  │ VAddr Bits:   [39]     │      │
│ │ PAddr Bits:   [56]     │  │ PAddr Bits:   [56]     │      │
│ │ ─────                  │  │ ─────                  │      │
│ │ Include: tiles/default │  │ Include: tiles/default │      │
│ └────────────────────────┘  └────────────────────────┘      │
└────────────────────────────────────────────────────────────┘
```

**数据模型**：

```typescript
interface DesignConfig {
  top: { nTiles: number };
  tiles: Tile[];
}

interface Tile {
  tile_id: number;
  include: string;
  coreDataBytes: number;
  xLen: number;
  vaddrBits: number;
  paddrBits: number;
  cores?: Core[];
}

interface Core {
  core_id: number;
  include: string;
}
```

### 5.4 Ball ISA Editor 详细规格

**输入**：`balldomains/*.toml`

**UI 结构**：

```
┌────────────────────────────────────────────────────────────┐
│ Ball ISA Editor                          [ + Add Instruction ]│
│ 6 instructions                                              │
├────────────────────────────────────────────────────────────┤
│ [🔍 Search instructions...]  [All Balls ▾]                 │
│                                                            │
│ ● GemminiBall  ● TraceBall  ● ReluBall  ● Mxfp2IntBall   │
├────────────────────────────────────────────────────────────┤
│ ┌── Mnemonic ──┬─ funct7 ─┬─ Ball ID ─┬── Ball ──┬─ Edit ─┐│
│ │ GEMMINI_...  │   2      │    0      │ Gemmini  │ Edit  ││
│ │ GEMMINI_...  │   3      │    0      │ Gemmini  │ Edit  ││
│ │ BDB_COUNTER  │   4      │    1      │ Trace    │ Edit  ││
│ │ RELU         │  50      │    3      │ Relu     │ Edit  ││
│ └──────────────┴──────────┴───────────┴──────────┴────────┘│
└────────────────────────────────────────────────────────────┘
```

**数据模型**：

```typescript
interface BallInstruction {
  mnemonic: string;
  funct7: number;
  bid: number;      // Ball ID
  ball: string;     // Ball 名称
}

type BallISA = BallInstruction[];
```

### 5.5 Simulator 详细规格

**输入**：用户选择（chip/simulator/binary）

**UI 结构**：

```
┌────────────────────────────────────────────────────────────┐
│ Simulation Control                       [● Running task-123]│
│ Running task-1737120000                                    │
├────────────────────────────────────────────────────────────┤
│ Chip:    [ toy    ▾]                                       │
│ Simulator: [ Verilator ▾]                                  │
│ Binary:   [ toy-toy-vecunit_matmul_ones-baremetal ▾]       │
│                                              [ ▶ Run       ]│
├────────────────────────────────────────────────────────────┤
│ Quick Commands                                              │
│ [Build Compiler] [Build Workload] [Run Verilator] [Build UVM]│
├────────────────────────────────────────────────────────────┤
│ Terminal Output                                    [Clear]   │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ [10:23:45] Starting: bbdev verilator --run --chip toy │   │
│ │ [10:23:45] Resolving paths from chip.toml...          │   │
│ │ [10:23:46] Loading design: designs/toy.toml            │   │
│ │ [10:23:47] Environment ready                           │   │
│ │ >>> Running simulation...                              │   │
│ │ >>> [Progress: 25%] Loading binary...                  │   │
│ │ >>> [Progress: 50%] Initializing tiles...              │   │
│ │ >>> [Progress: 75%] Running test...                   │   │
│ │ [10:25:30] Simulation completed successfully          │   │
│ │ [10:25:30] Exit code: 0                                │   │
│ │ [10:25:30] Waveform saved: target/toy/sim.vcd         │   │
│ └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**日志类型与颜色**：

| 类型 | 颜色（暗色） | 颜色（亮色） |
|------|---------------|---------------|
| info | `#a1a1aa` | `#5d6972` |
| success | `#34d399` | `#07866f` |
| warning | `#fbbf24` | `#b76b08` |
| error | `#f87171` | `#be3b36` |

### 5.6 Agent Panel 详细规格

**位置**：右侧可折叠面板的"Agent Assistant"标签

**支持的 Agent**：

| Agent ID | 显示名 | 颜色 | 描述 |
|----------|--------|------|------|
| claude | Claude | `#d4a574` | 复杂推理 |
| codex | Codex | `#009c83` | 代码生成 |
| gemini | Gemini | `#4285f4` | 多模态 |

**UI 结构**：

```
┌────────────────────────────┐
│ [Claude] [Codex] [Gemini]  │  ← Agent 切换
├────────────────────────────┤
│ QUICK ACTIONS              │
│ [调试仿真错误] [优化速度]   │  ← Tab-aware hints
├────────────────────────────┤
│                            │
│  🤖 问任何关于芯片的问题    │  ← 空状态
│                            │
│  [U] 你好                  │  ← 用户气泡
│       [A] 你好！我可以...  │  ← 助手气泡
│       ┌──────────────┐     │
│       │ // config     │    │  ← 代码块
│       │ ...           │    │
│       └──────────────┘     │
│                            │
│  [A] ●●●                   │  ← 思考动画
├────────────────────────────┤
│ [输入消息...      ]  [→]   │  ← 输入框
└────────────────────────────┘
```

**Tab-aware Hints**：

| 当前 Tab | Quick Hints |
|----------|-------------|
| chip | 添加新的仿真目标 / 配置 UVM 参数 / 检查设计包含路径 |
| design | 添加新的 Tile / 调整 Core 参数 / 生成默认配置 |
| ball | 注册新指令 / 查看 Ball 依赖 / 生成 ISA 测试 |
| sim | 调试仿真错误 / 优化仿真速度 / 分析波形输出 |

---

## 6. UI/UX 规格

### 6.1 布局尺寸

| 元素 | 尺寸（桌面端） |
|------|----------------|
| Header 高 | `48px` |
| 左侧抽屉宽 | `220px` |
| 右侧面板宽 | `280px`（可折叠到 `0px`） |
| 折叠按钮宽 | `20px` |
| 内容区内边距 | `24px` |
| 卡片间距 | `16px` |
| 卡片内边距 | `16px` |
| Tile 卡片最小宽 | `320px` |
| Badge 圆角 | `9999px` |
| 圆角（卡片） | `12px` |
| 圆角（按钮/输入） | `8px` |
| 圆角（小元素） | `6px` |

### 6.2 主题

**亮色（Codex Light）**：

```css
--bg-primary: #fdfdfc;
--bg-secondary: #f4f6f6;
--bg-sidebar: #eef2f1;
--bg-hover: #e8eded;
--border-color: #d9e0e0;
--text-primary: #20292f;
--text-secondary: #5d6972;
--text-muted: #8a9399;
--accent-color: #009c83;
--accent-hover: #007a66;
```

**暗色（Codex Dark）**：

```css
--bg-primary: #18181c;
--bg-secondary: #222226;
--bg-sidebar: #1e1e22;
--bg-hover: #2a2a30;
--border-color: #3a3a42;
--text-primary: #e3e3e8;
--text-secondary: #a1a1aa;
--text-muted: #71717a;
--accent-color: #00bfa5;
--accent-hover: #00d4b8;
```

**切换策略**：默认跟随系统 `prefers-color-scheme`，未来可手动覆盖。

### 6.3 字体

| 用途 | 字体 | 备选 |
|------|------|------|
| UI | Inter | -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif |
| 代码 | JetBrains Mono | 'SF Mono', Monaco, 'Cascadia Code', monospace |

字号：

| 元素 | 大小 |
|------|------|
| H1 / 应用名 | `15px` fontWeight 600 |
| H2 / Tab 标题 | `18px` fontWeight 600 |
| H3 / 区块标题 | `14px` fontWeight 600 |
| 正文 | `13px` |
| 小字 / Label | `11px` / `12px` |
| Badge | `11px` |

### 6.4 动效

| 场景 | 动效 | 时长 |
|------|------|------|
| 按钮悬停 | opacity 0.85 | `0.15s ease` |
| 抽屉展开/折叠 | maxHeight + opacity | `0.2s ease` |
| 右侧面板折叠 | width | `0.25s ease` |
| 思考动画 | 三点 pulse | `1s ease-in-out infinite` |
| 焦点 | border-color | `0.15s ease` |

### 6.5 图标

23+ 内联 SVG 图标，全部基于 Lucide 设计语言。`size` 属性可控制像素。

---

## 7. 数据模型

### 7.1 工作区

```typescript
interface Workspace {
  name: string;
  path: string;           // 绝对路径
  structure: TreeNode[];  // 文件树根
}

interface TreeNode {
  name: string;
  type: 'dir' | 'file';
  children?: TreeNode[];
  path: string;           // 相对工作区根
}
```

### 7.2 仿真

```typescript
type SimulatorId = 'verilator' | 'bebop-verilator' | 'bemu' | 'p2e';

interface SimulationTemplate {
  id: SimulatorId;
  name: string;          // 显示名
  desc: string;
}

type LogType = 'info' | 'success' | 'warning' | 'error';

interface LogEntry {
  type: LogType;
  text: string;
  ts: number;
}

interface SimulationState {
  selectedChip: string;
  selectedSim: SimulatorId;
  selectedBinary: string;
  isRunning: boolean;
  taskId: string | null;
  logs: LogEntry[];
}
```

### 7.3 Agent

```typescript
interface Agent {
  id: 'claude' | 'codex' | 'gemini';
  name: string;
  color: string;
  icon: string;          // 单字母
  desc: string;
}

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: number;
  role: ChatRole;
  content: string;
  code?: string;         // 可选代码块
  ts: number;
}
```

---

## 8. 国际化

### 8.1 语言

| 语言 | Code | 状态 |
|------|------|------|
| 简体中文 | `zh` | ✅ 完整 |
| English | `en` | ✅ 完整 |

### 8.2 文案结构

`translations.<lang>` 是扁平的 key-value 映射，覆盖所有 UI 文案。按模块分组：

```
app / sidebar / tabs / chip / design / ball / sim / agent
```

### 8.3 添加新语言流程

1. 在 `translations` 中增加 `<lang>` 分支
2. 复制 `zh` 的 keys，逐条翻译
3. 在 `App` 中增加切换按钮 / 自动检测 `navigator.language`
4. 翻译文案需 100% 覆盖（缺 fallback 到 key）

---

## 9. 集成接口

### 9.1 与 bbdev CLI

**当前**：UI 内 hardcoded 4 个命令按钮 + Simulator 自由输入。

**未来**：通过 Tauri 进程管理真实启动 bbdev。

```rust
#[tauri::command]
async fn run_bbdev(args: Vec<String>, event: tauri::Emitter) -> Result<String, String> {
    // spawn bbdev with args, stream stdout/stderr via event
}
```

**事件**：

```typescript
// Frontend 订阅
listen<LogEntry>('bbdev://log', (event) => {
  simStore.appendLog(event.payload);
});

listen<{ task_id: string, exit_code: number }>('bbdev://exit', (event) => {
  simStore.markFinished(event.payload);
});
```

### 9.2 与 bbdev/mcp

**当前**：UI 内 mock 响应。

**未来**：右侧 Agent 面板调用真实 MCP。

```rust
#[tauri::command]
async fn mcp_request(
    agent_id: String,
    messages: Vec<ChatMessage>,
    context: serde_json::Value,  // 当前 chip/design/ball 状态
) -> Result<McpResponse, String>;
```

### 9.3 文件系统

**当前**：Mock 文件树。

**未来**：Tauri 文件命令。

```rust
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

---

## 10. 性能与质量

### 10.1 性能预算

| 指标 | 预算 |
|------|------|
| 首屏渲染 (WebView 启动 → 首屏可见) | < 1.5s |
| Tab 切换 | < 100ms |
| 打开 / 保存 TOML | < 200ms |
| 仿真日志流（每条） | < 50ms |
| 包体积 (Tauri 安装包) | < 30 MB |
| 内存占用（空闲） | < 200 MB |

### 10.2 质量门禁

- [ ] TypeScript strict 模式 0 errors
- [ ] ESLint 0 errors
- [ ] 所有交互元素键盘可达
- [ ] 所有颜色对比度 ≥ WCAG AA
- [ ] 启动时间 < 2s（冷启动）

### 10.3 测试策略

| 层 | 工具 | 目标 |
|----|------|------|
| 单元 | Vitest | 组件 / 工具函数 / i18n |
| 集成 | Playwright（可选） | E2E 关键流程 |
| Rust | cargo test | 命令 / 进程管理 |

---

## 11. 安全与权限

### 11.1 原则

- **本地优先**：所有数据留在本机，无云端上传
- **最小权限**：Tauri 只暴露必需的 IPC 命令
- **路径白名单**：文件操作限制在用户选定的工作区内
- **命令审计**：bbdev 子进程调用记录到日志

### 11.2 待办

- [ ] Tauri capabilities 配置最小化
- [ ] 文件写入前的路径校验
- [ ] 子进程执行的 bbdev 命令记录到审计日志

---

## 12. 路线图与里程碑

| 里程碑 | 内容 | 状态 |
|--------|------|------|
| **M0: Web 原型** | 全部功能可视化的可演示 Web 版 | ✅ 完成 |
| **M1: 模块化** | Vite + TS 拆分、组件 1:1 迁移 | ☐ 待 Phase B |
| **M2: 数据层** | 真实 TOML 读写、Zustand stores | ☐ 待 Phase C |
| **M3: 仿真集成** | 真实 bbdev 子进程 + 日志流 | ☐ 待 Phase D |
| **M4: Agent 集成** | 真实 MCP 调用、流式响应 | ☐ 待 Phase E |
| **M5: 桌面化** | 托盘 / 通知 / 全局快捷键 | ☐ 待 Phase F |
| **M6: 结果可视化** | 追踪 / 波形 / Perfetto | ☐ 待 Phase G |
| **M7: 发布** | 打包 / 安装程序 / 文档 | ☐ 待 Phase H |

详细开发任务见 [`dev/DEV_PLAN.md`](./dev/DEV_PLAN.md)。

---

## 13. 附录

### 附录 A：Mock 数据映射

| Mock | 真实位置 |
|------|----------|
| `MOCK_PROJECT.structure` | 用户选定工作区根 |
| `MOCK_CHIP_CONFIG` | `<workspace>/examples/chips/<chip>/configs/chip.toml` |
| `MOCK_DESIGN_CONFIG` | `<workspace>/examples/chips/<chip>/configs/designs/<design>.toml` |
| `MOCK_BALL_ISA` | `<workspace>/examples/chips/<chip>/configs/balldomains/<ball>.toml` |
| `SIMULATION_TEMPLATES` | bbdev CLI 探测的子命令 |
| `BBDEV_COMMANDS` | 4 个常用 bbdev 命令预设 |

### 附录 B：组件复用关系图

```
App
├── Header
├── LeftDrawerNav
│   └── drawerGroups（4 组：chip / design / ball / sim）
├── Main
│   ├── ChipEditor（受 activeSubTab 控制）
│   ├── DesignEditor
│   ├── BallISAEditor
│   └── Simulator
└── RightPanel（可折叠）
    ├── Explorer Tab
    │   └── TreeView
    │       └── TreeItem（递归）
    └── Agent Tab
        ├── AgentSelector（claude/codex/gemini）
        ├── QuickHints（基于 activeTab）
        └── MessageList + Input
```

### 附录 C：相关文件

| 文件 | 用途 | 状态 |
|------|------|------|
| [`PROJECT_ANALYSIS.md`](./PROJECT_ANALYSIS.md) | Buckyball 项目结构与命令速查 | 稳定 |
| [`dev/DEV_PLAN.md`](./dev/DEV_PLAN.md) | 详细开发任务与里程碑 | 活跃 |
| [`frontend/index.html`](./frontend/index.html) | **当前唯一前端来源**（2063 行自包含 React 应用） | ✅ 活跃 |
| [`frontend/app.js`](./frontend/app.js) | 旧版独立 JS（已合并入 `index.html`） | ⚠️ Deprecated，仅作历史参考 |
| [`frontend/UI_REFERENCE.md`](./frontend/UI_REFERENCE.md) | UI 视觉参考 | 参考 |
| [`frontend/de/`](./frontend/de/) | 内部迭代副本（已被 `index.html` 取代） | 待清理 |

---

*规格书版本 v1.0 — 2026-09-25*