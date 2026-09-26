# Buckyball Studio 设计文档

> DSA 领域专用加速器开发的图形化 IDE

---

## 1. 项目概述

### 1.1 背景

[Buckyball](https://github.com/DangoSys/buckyball) 是一个开源的 DSA（Domain-Specific Accelerator）框架，用于构建机器学习、图处理等领域的专用加速器。项目使用 Nix + nix develop 环境，通过 `bbdev` CLI 工具管理编译、仿真、综合等流程。

### 1.2 问题

当前开发流程存在以下痛点：
- **配置分散**：chip.toml、designs/*.toml、balldomains/*.toml 等多个文件需要手动编辑
- **命令行门槛高**：`bbdev` 命令参数复杂，需要记忆大量选项
- **仿真调试不便**：需要分别打开终端、波形查看器、日志文件
- **缺少可视化**：无法直观看到芯片结构、Tile 布局、Ball 连接

### 1.3 目标

Buckyball Studio 是一个桌面 IDE，旨在：
- 提供图形化的配置编辑体验
- 一键执行编译/仿真/综合流程
- 集成仿真结果和波形查看
- 降低 DSA 开发的学习成本

---

## 2. 核心概念

### 2.1 芯片结构层级

```
Chip (芯片)
├── designs/*.toml (设计配置)
│   └── Tile (瓦片)
│       ├── Tile 配置 (coreDataBytes, xLen 等)
│       └── Core (RISC-V 核心)
│           ├── balldomain (Ball 域)
│           │   ├── Ball 列表 (Gemmini, Matrix, Relu...)
│           │   └── ballISA (指令映射)
│           ├── gpdomain (向量处理域)
│           │   ├── laneNumber, vLen, dLen
│           │   └── chainingSize
│           ├── memdomain (内存域)
│           │   └── 缓存配置
│           └── frontend (前端)
│               └── 指令前端配置
├── sims (仿真器配置)
│   ├── verilator
│   ├── p2e
│   └── firesim
└── uvm (验证配置)
    ├── balls
    └── ips
```

### 2.2 Ball 概念

Ball 是 DSA 中的核心抽象，代表一个功能加速单元：
- **GemminiBall** - 矩阵乘法加速器
- **MatrixBall** - 通用矩阵运算
- **ReluBall** - ReLU 激活函数
- **TraceBall** - 性能追踪

每个 Ball 有：
- `ballClass` - Python 类路径
- `ballId` - 硬件 ID
- `inBW/outBW` - 输入输出带宽
- `config` - Ball 专用配置

---

## 3. 技术架构

### 3.1 技术选型

| 组件 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Tauri 2.0 | 轻量(~10MB)、Rust 后端 + Web 前端 |
| 前端框架 | React 18 + TypeScript | 组件化、生态丰富 |
| UI 样式 | Tailwind CSS | 快速样式开发 |
| 状态管理 | Zustand | 轻量、TypeScript 原生支持 |
| 构建工具 | Vite 5 | HMR 快速热更新 |
| IPC | Tauri Command | 前后端安全通信 |

### 3.2 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Buckyball Studio (桌面)                    │
├─────────────────────────────────────────────────────────────┤
│  React Frontend (Web View)                                   │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │ Explorer │  Editor  │  Output  │  Debug   │            │
│  │  项目树   │  TOML编辑器 │ 终端输出  │ 波形查看  │            │
│  └──────────┴──────────┴──────────┴──────────┘            │
├─────────────────────────────────────────────────────────────┤
│  Tauri IPC (Command API)                                     │
│  ├── open_project(path) → 加载配置                          │
│  ├── read_config() → 解析 TOML                             │
│  ├── write_config() → 保存 TOML                            │
│  ├── run_bbdev(args) → 执行 bbdev 命令                      │
│  ├── get_task_status(trace_id) → 查询任务状态              │
│  └── open_waveform(path) → 打开波形文件                     │
├─────────────────────────────────────────────────────────────┤
│  Rust Backend                                               │
│  ├── 文件系统操作 (read_dir, read_file, write_file)         │
│  ├── TOML 解析 (toml crate)                                 │
│  ├── 子进程管理 (bbdev 命令执行)                            │
│  └── 波形解析 (支持 .vcd, .fst)                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │    bbdev CLI     │
                    │  (Nix 环境中)    │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   buckyball      │
                    │  (仿真/编译/综合) │
                    └──────────────────┘
```

---

## 4. 功能模块

### 4.1 项目管理器

**功能**：
- 打开/关闭 buckyball 项目目录
- 显示目录树结构
- 快速定位配置文件

**UI 布局**：
```
┌─────────────┐
│ 📁 项目树    │
├─────────────┤
│ ▼ buckyball  │
│   ▼ examples │
│     ▼ chips  │
│       ▼ toy  │
│         ├─ arch/      │
│         ├─ configs/ ◄─┼── chip.toml
│         │    ├─ designs/
│         │    ├─ balldomains/
│         │    └─ gpdomains/
│         ├─ workloads/
│         └─ regression/
│       ▶ poly/
│       ▶ pebble/
│       ▶ goban/
└─────────────┘
```

**快捷操作**：
- 双击 `.toml` 文件 → 在编辑器中打开
- 右键菜单 → New Design / Import Design

---

### 4.2 Chip 配置编辑器

**功能**：
- 可视化编辑 `chip.toml` 文件
- 左侧：配置结构树
- 右侧：参数编辑面板

**UI 布局**：
```
┌────────────────────────────────────────────────────────────┐
│ 📁 configs/chip.toml                              [保存]  │
├──────────────────┬─────────────────────────────────────────┤
│ ▼ sims           │  Simulation Config                      │
│   ▶ verilator    │  ┌─────────────────────────────────────┐│
│   ▶ p2e          │  │ verilator: [sims.verilator.......] ││
│   ▶ firesim      │  │ p2e:         [sims.p2e.......]      ││
│ ▼ uvm            │  │ firesim:     [sims.firesim...]      ││
│   balls: [...]   │  └─────────────────────────────────────┘│
│   ips: [...]     │                                          │
│ ▼ designs        │  UVM Config                              │
│   ▶ toy          │  ┌─────────────────────────────────────┐│
│ ▶ (root)         │  │ balls: [gemmini] [axis]            ││
│                   │  │ ips:   [axis]                      ││
│                   │  └─────────────────────────────────────┘│
└──────────────────┴─────────────────────────────────────────┘
```

---

### 4.3 Design 编辑器

**功能**：
- 编辑设计配置（Tile 数量、Core 配置）
- 选择 Balldomain、GPdomain、Memdomain
- 可视化显示 Tile 布局

**UI 布局**：
```
┌────────────────────────────────────────────────────────────┐
│ 📁 designs/toy.toml                               [保存]   │
├──────────────────┬──────────────────────────────────────────┤
│ ▼ top            │  Tile Layout (可视化)                    │
│   nTiles: [1]    │  ┌─────────────────────────────────┐    │
│ ▼ tiles[0]       │  │          ┌──────────┐           │    │
│   tile_id: 0     │  │          │   Tile 0  │           │    │
│   include: ...   │  │          │ ┌──────┐ │           │    │
│ ▼ balldomain     │  │          │ │Core 0│ │           │    │
│   ▶ Gemmini      │  │          │ │Ball  │ │           │    │
│   ▶ Trace        │  │          │ │GP Dom│ │           │    │
│   ▶ Relu         │  │          │ └──────┘ │           │    │
│                   │  │          └──────────┘           │    │
│                   │  └─────────────────────────────────┘    │
│                   │                                          │
│                   │  Ball Assignments                        │
│                   │  ┌─────────────────────────────────────┐│
│                   │  │ [✓] Gemmini   Matrix Unit          ││
│                   │  │ [✓] Trace     Trace Unit           ││
│                   │  │ [ ] Relu      Activation Unit      ││
│                   │  └─────────────────────────────────────┘│
└──────────────────┴──────────────────────────────────────────┘
```

---

### 4.4 Ball ISA 编辑器

**功能**：
- 查看/编辑 Ball 支持的指令
- 添加/删除指令映射
- 验证指令 ID 冲突

**UI 布局**：
```
┌────────────────────────────────────────────────────────────┐
│ Balldomain: balldomains/default.toml              [保存]   │
├────────────────────────────────────────────────────────────┤
│ Ball Num: [4]                                               │
│                                                            │
│ ┌─ GemminiBall ─────────────────────────────────────────┐ │
│ │ ballId: 0   Class: examples.balls.gemmini.GemminiBall │ │
│ │ inBW: 2      outBW: 4                                  │ │
│ │                                                            │
│ │ Instructions:                                             │
│ │ ┌────────────────────────────────────────────────────┐  │ │
│ │ │ Mnemonic              │ funct7 │ bid │ Config     │  │ │
│ │ ├────────────────────────────────────────────────────┤  │ │
│ │ │ GEMMINI_CONFIG        │ 2      │ 0   │ [Edit]     │  │ │
│ │ │ GEMMINI_FLUSH         │ 3      │ 0   │ [Edit]     │  │ │
│ │ │ GEMMINI_LOOP_WS       │ 87     │ 0   │ [Edit]     │  │ │
│ │ │ ...                                                 │  │ │
│ │ └────────────────────────────────────────────────────┘  │ │
│ │ [+ Add Instruction]                                      │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─ ReluBall ────────────────────────────────────────────┐ │
│ │ ...                                                      │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

### 4.5 仿真控制台

**功能**：
- 执行 `bbdev` 命令（编译、仿真、综合）
- 实时显示输出日志
- 支持长时间运行的异步任务

**支持的命令**：
| 命令 | 说明 |
|------|------|
| `bbdev compiler --build --chip <name>` | 构建 MLIR 编译器 |
| `bbdev workload --build --chip <name>` | 编译工作负载 |
| `bbdev verilator --run --chip <name> --binary <bin>` | Verilator 仿真 |
| `bbdev bebop-verilator --run --chip <name> --binary <bin>` | Bebop 仿真 |
| `bbdev uvm --build --ball <name>` | UVM 构建 |
| `bbdev dc --area --chip <name>` | 面积综合 |

**UI 布局**：
```
┌────────────────────────────────────────────────────────────┐
│ ▶ Build Compiler    ▶ Build Workload    ⏹ Stop           │
├────────────────────────────────────────────────────────────┤
│ Target: [toy ▼]   Binary: [vecunit_matmul ▼]   [Run ▶]    │
├────────────────────────────────────────────────────────────┤
│ ▼ Build Output                                              │
│ ─────────────────────────────────────────────────────────  │
│ [10:30:15] Starting compiler build for chip: toy           │
│ [10:30:16] Running: cmake --build build/ --target buddy-opt│
│ [10:30:45] ✓ Compiler build completed                     │
│ [10:30:46] Binary: toy-toy-vecunit_matmul_ones-baremetal  │
│                                                              │
├────────────────────────────────────────────────────────────┤
│ Status: ✓ Ready | Job ID: abc123 | Time: 00:00:32          │
└────────────────────────────────────────────────────────────┘
```

---

### 4.6 波形查看器

**功能**：
- 显示仿真生成的波形文件（.vcd, .fst）
- 支持信号搜索和高亮
- 设置断点标记

**UI 布局**：
```
┌────────────────────────────────────────────────────────────┐
│ File: trace.vcd                              [Open] [Zoom] │
├────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────────────────────────────┐ │
│ │ Signals      │ │ Waveform Display                     │ │
│ ├──────────────┤ │                                      │ │
│ │ ▼ ctrl       │ │ ─┬──┬──────────┬─────────            │ │
│ │   start      │ │   │  │          │                     │ │
│ │   done       │ │   └──┘          └─────────            │ │
│ │ ▼ data       │ │                                      │ │
│ │   a[31:0]    │ │ ─────────────────────────            │ │
│ │   b[31:0]    │ │ ████████████████                     │ │
│ │   result     │ │ ─────────────────────────            │ │
│ └──────────────┘ │                                      │ │
│                   └──────────────────────────────────────┘ │
│ Time: 1000ns | Signals: 256 | Zoom: 1x                     │
└────────────────────────────────────────────────────────────┘
```

---

## 5. 数据流

### 5.1 项目打开流程

```
1. 用户选择项目目录
       │
       ▼
2. Rust: read_dir(project_path)
       │
       ▼
3. 过滤 .toml 文件和关键目录
       │
       ▼
4. 返回文件树结构给前端
       │
       ▼
5. React: 更新 Zustand store
       │
       ▼
6. UI: 显示项目树
```

### 5.2 配置编辑流程

```
1. 用户在编辑器中修改参数
       │
       ▼
2. React: 验证输入合法性
       │
       ▼
3. React: 调用 Tauri command
       │
       ▼
4. Rust: 解析 TOML，修改内存对象
       │
       ▼
5. Rust: 序列化回 TOML 字符串
       │
       ▼
6. Rust: 写入文件系统
       │
       ▼
7. 返回成功状态
```

### 5.3 仿真执行流程

```
1. 用户点击 "Run" 按钮
       │
       ▼
2. React: 调用 bbdev 命令
       │
       ▼
3. Rust: 在 Nix 环境中执行 bbdev
       │
       ▼
4. Rust: 捕获 stdout/stderr
       │
       ▼
5. Rust: 实时发送日志到前端
       │
       ▼
6. React: 更新日志面板
       │
       ▼
7. 仿真完成 → 生成波形文件
       │
       ▼
8. 用户点击 "View Waveform"
       │
       ▼
9. 打开波形查看器
```

---

## 6. 文件结构

```
buckyball-studio/
├── src/
│   ├── components/           # React 组件
│   │   ├── Sidebar.tsx      # 项目浏览器
│   │   ├── TabBar.tsx       # 功能标签页
│   │   ├── LogTerminal.tsx  # 日志终端
│   │   ├── TreeView.tsx     # 配置树视图
│   │   ├── ParamEditor.tsx  # 参数编辑器
│   │   └── WaveformViewer.tsx # 波形查看器
│   │
│   ├── views/               # 主视图
│   │   ├── ChipEditor.tsx   # Chip 配置编辑器
│   │   ├── DesignEditor.tsx # Design 编辑器
│   │   ├── BallEditor.tsx   # Ball ISA 编辑器
│   │   └── Simulator.tsx    # 仿真控制台
│   │
│   ├── stores/              # Zustand 状态
│   │   ├── projectStore.ts  # 项目状态
│   │   ├── configStore.ts   # 配置状态
│   │   └── simStore.ts      # 仿真状态
│   │
│   ├── types/               # TypeScript 类型
│   │   ├── chip.ts          # Chip 配置类型
│   │   ├── design.ts        # Design 配置类型
│   │   └── ball.ts          # Ball 配置类型
│   │
│   ├── utils/               # 工具函数
│   │   ├── toml.ts          # TOML 解析/序列化
│   │   └── bbdev.ts         # bbdev 命令封装
│   │
│   ├── App.tsx              # 根组件
│   ├── main.tsx             # 入口
│   └── index.css            # 全局样式
│
├── src-tauri/               # Rust 后端
│   ├── src/
│   │   ├── main.rs          # 入口
│   │   ├── commands.rs      # Tauri 命令
│   │   ├── file_ops.rs      # 文件操作
│   │   ├── bbdev.rs         # bbdev 执行
│   │   └── waveform.rs       # 波形解析
│   │
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── DESIGN.md
```

---

## 7. 开发计划

### Phase 1: 基础框架 (MVP)
- [ ] 项目初始化 (Vite + React + Tauri)
- [ ] 项目浏览器 (打开目录、显示文件树)
- [ ] TOML 文件读取/解析/保存
- [ ] 基础 UI 布局

### Phase 2: 配置编辑
- [ ] Chip.toml 可视化编辑器
- [ ] Design 配置编辑器
- [ ] TreeView 组件 (树形配置展示)
- [ ] 参数编辑表单

### Phase 3: 仿真集成
- [ ] bbdev 命令封装
- [ ] 仿真执行 UI
- [ ] 日志实时显示
- [ ] 任务状态轮询

### Phase 4: 高级功能
- [ ] Ball ISA 编辑器
- [ ] 波形查看器
- [ ] 配置对比工具
- [ ] 项目模板系统

---

## 8. 参考资料

- [Buckyball GitHub](https://github.com/DangoSys/buckyball)
- [Buckyball 文档](https://docs.buckyball.tech)
- [bbdev MCP Server](./scripts/claude/README.md)
- [ECOS Studio](../ecos-studio) - 参考 UI 风格

---

## 9. 附录

### A. 配置文件参考

#### chip.toml
```toml
[designs]
include = "designs/toy.toml"

[sims]
verilator = "sims.verilator.BuckyballToyVerilatorConfig"
p2e = "sims.p2e.P2EToyLinuxConfig"
firesim = "sims.firesim.FireSimBuckyballToyConfig"

[uvm]
balls = ["gemmini"]
ips = ["axis"]
```

#### designs/toy.toml
```toml
[top]
nTiles = 1

[[tiles]]
tile_id = 0
include = "tiles/default.toml"
```

#### balldomains/default.toml
```toml
ballNum = 4

ballIdMappings = [
  { ballId = 0, ballName = "GemminiBall", ballClass = "..." },
  { ballId = 1, ballName = "TraceBall", ballClass = "..." },
]

ballISA = [
  { mnemonic = "GEMMINI_CONFIG", funct7 = 2, bid = 0 },
  { mnemonic = "RELU", funct7 = 50, bid = 3 },
]
```

### B. bbdev 命令速查

```bash
# 编译器
bbdev compiler --build --chip toy
bbdev compiler --clean --chip toy

# 工作负载
bbdev workload --build --chip toy
bbdev workload --clean --chip toy
bbdev workload --tohex --chip toy

# 仿真
bbdev verilator --run --chip toy --binary <bin> --batch
bbdev bebop-verilator --run --chip toy --binary <bin>
bbdev bebop-bemu --sim --chip toy --binary <bin>

# UVM
bbdev uvm --build --ball <name>
bbdev uvm --run --ball <name>

# 综合
bbdev dc --area --chip toy
bbdev dc --power --chip toy
```
