# Buckyball 项目分析报告

**分析日期**: 2026-09-24  
**项目路径**: D:\acode\buckyball

---

## 1. 项目概述

**Buckyball** 是一个开源的**领域特定架构 (Domain-Specific Architecture, DSA) 敏捷开发框架**。它提供了统一的抽象层、标准化接口和系统级基础设施，用于开发、部署和执行各种硬件加速器（DSAs）。

### 核心目标

- 消除重复的系统工程工作
- 让研究人员专注于加速器设计，而非从零构建基础设施
- 支持机器学习、图处理、信号处理、科学计算等多种工作负载

### 应用场景

- 机器学习加速器 (NPU)
- 图神经网络处理器
- 数字信号处理 (DSP)
- 科学计算加速器

---

## 2. 技术栈

| 层次 | 技术 |
|------|------|
| **硬件描述** | Scala + Chisel, SystemVerilog |
| **仿真引擎** | Rust + Verilator + Spike + VCS |
| **验证框架** | SystemVerilog + UVM 1.2 |
| **编译栈** | MLIR + LLVM + Buddy-MLIR |
| **构建系统** | Nix Flakes, Mill (Scala), Cargo (Rust) |
| **API 服务** | Python + TypeScript + Motia |
| **FPGA/仿真** | FireSim, Vitis, P2E |

---

## 3. 目录结构

```
buckyball/
├── arch/                    # 硬件架构 (Scala/Chisel)
├── bebop/                   # 仿真框架 (Rust)
├── bbdev/                   # 开发者工具链 (Python/TypeScript)
├── verify/                  # UVM 验证框架
├── examples/                # 参考设计
├── compiler/                 # MLIR 编译栈
├── bb-tests/                # 工作负载和测试
├── bbdev/                   # API 服务
└── verify/                  # UVM 验证
```

---

## 4. 核心组件详解

### 4.1 `arch/` — 硬件架构

**位置**: `D:\acode\buckyball\arch`

**描述**: 使用 Scala + Chisel 编写的模块化硬件描述。

**子目录结构**:

```
arch/
├── framework/               # 模块化硬件组件
│   ├── balldomain/         # Ball ISA 和领域加速器
│   ├── gpdomain/           # 通用处理器域 (序列器、解码器)
│   ├── memdomain/          # 内存子系统 (TLB, DMA, 一致性)
│   ├── mem-core/           # AXI/CHI 互联基础设施
│   ├── rvv/                # RISC-V 向量扩展实现
│   ├── root/               # ROOT (Rigid Organisation, Open Topology) Mesh 互联
│   └── system/             # Tile 和 Chip 级集成
└── sims/                   # 仿真配置
    ├── verilator/          # Verilator 仿真
    ├── firesim/            # FireSim FPGA 仿真
    └── p2e/                # FPGA 原型
```

**关键文件**:
- `framework/root/` - 核心互联架构
- `framework/memdomain/` - 内存管理单元

### 4.2 `bebop/` — 仿真框架 (Rust)

**位置**: `D:\acode\buckyball\bebop`

**描述**: 敏捷 NPU 仿真框架，使用 Rust 编写，支持多种仿真后端。

**子目录结构**:

```
bebop/
├── src/
│   ├── nodes/
│   │   ├── bemu/           # BEMU 快速模型 (基于 Spike ISA)
│   │   ├── verilator/     # Verilator RTL 仿真
│   │   └── p2e/           # FPGA/Emulation 目标
│   ├── simulation/        # 仿真抽象层
│   └── main.rs            # 入口
├── tests/                 # 测试用例
├── Cargo.toml              # Rust 工作空间配置
└── flake.nix              # Nix 环境配置
```

**支持的后端**:

| 后端 | 说明 | 速度 |
|------|------|------|
| **BEMU** | 树内仿真器，使用 Spike ISA 模拟器 | 最快 |
| **Verilator** | RTL 仿真 | 中等 |
| **P2E** | FPGA 比特流准备 | 最慢 |
| **VCS** | 商业 RTL 仿真 (Synopsys) | 中等 |

**核心库** (`src/nodes/lib/`):

| 库名 | 功能 |
|------|------|
| `elf/` | ELF 二进制加载 |
| `syscall/` | 系统调用处理 |
| `rtl-trace/` | 信号级追踪 |
| `trace-perfetto/` | Perfetto 追踪转换 |
| `chipcrowd/` | Chip 仿真工具 |
| `dtb/` | 设备树构建 |
| `bank-hash/` | Bank 哈希比较器 |

### 4.3 `bbdev/` — 开发者工具链

**位置**: `D:\acode\buckyball\bbdev`

**描述**: 基于 Motia 框架的后端 API 服务，提供工作流自动化能力。

**子目录结构**:

```
bbdev/
├── api/                    # HTTP API
│   ├── steps/             # 模块化工作流步骤
│   │   ├── verilator/     # Verilator 仿真流程
│   │   ├── vcs/          # VCS 仿真流程
│   │   ├── yosys/        # Yosys 综合
│   │   ├── bebop/        # Bebop 仿真
│   │   ├── dc/           # Design Compiler
│   │   ├── pt/           # Power Analysis
│   │   ├── uvm/          # UVM 验证
│   │   ├── firesim/      # FireSim FPGA
│   │   ├── compiler/     # 编译
│   │   ├── kernel/       # 内核构建
│   │   ├── workload/     # 工作负载
│   │   ├── ip/          # IP 生成
│   │   └── regression/   # 回归测试
│   ├── services/          # 服务层
│   ├── utils/             # 工具函数
│   ├── tests/            # API 测试
│   ├── pyproject.toml     # Python 依赖
│   └── requirements.txt   # Python 依赖
├── mcp/                    # MCP 服务器 (AI Agent 接口)
│   ├── tools/             # MCP 工具定义
│   └── server.py         # MCP 服务器
└── flake.nix              # Nix 环境
```

**关键步骤** (`api/steps/`):

| 步骤 | 功能 |
|------|------|
| `01_clean_*` | 清理构建产物 |
| `02_verilog_*` | 生成 Verilog |
| `03_build_*` | 构建比特流/可执行文件 |
| `04_sim_*` | 运行仿真 |
| `05_run_*` | 执行工作负载 |
| `06_batch_*` | 批量运行 |

### 4.4 `verify/` — UVM 验证框架

**位置**: `D:\acode\buckyball\verify`

**描述**: 基于 UVM 1.2 的硬件验证组件。

**子目录结构**:

```
verify/
├── uvm/
│   ├── src/
│   │   ├── ball/          # Ball 通用验证基础设施
│   │   │   ├── agents/    # UVM Agent (cmd, mem, resp)
│   │   │   ├── bb_blink_defs.svh   # Blink 协议定义
│   │   │   ├── bb_blink_if.sv      # 接口定义
│   │   │   ├── bb_blink_items.svh  # 事务项
│   │   │   └── cov/              # 覆盖率模型
│   │   └── ip/             # IP 级验证组件
│   └── ip.toml             # IP 配置
└── flake.nix
```

### 4.5 `examples/` — 参考设计

**位置**: `D:\acode\buckyball\examples`

**描述**: 完整的芯片配置和加速器参考设计。

**子目录**:

| 目录 | 说明 |
|------|------|
| `chips/` | 完整芯片配置 (toy, pebble, goban, poly, multi-rocket) |
| `balls/` | 领域加速器示例 |
| `cores/` | CPU 核心集成 (Rocket, BOOM) |

**加速器示例** (`examples/balls/`):

| 加速器 | 功能 |
|--------|------|
| `gemmini/` | 矩阵乘法加速器 |
| `smatmul/` | 稀疏矩阵乘法 |
| `im2col/` | 图像卷积预处理 |
| `transpose/` | 矩阵转置 |
| `matadd/` | 矩阵加法 |
| `relu/` | ReLU 激活函数 |
| `maxpool/` | 最大池化 |
| `toint8/` | 浮点转 int8 |
| `int2fp/` | int8 转浮点 |

### 4.6 `compiler/` — MLIR 编译栈

**描述**: 基于 MLIR/LLVM 的编译基础设施（git submodule 指向 `buddy-mlir`）。

**功能**:
- 将高级运算转换为 Ball 指令
- 优化并降至物理 bank 分配

---

## 5. 组件关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                          用户 / AI Agent                         │
│                     (通过 bbdev CLI 或 MCP)                      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                           bbdev                                  │
│                   (Python API + Motia 后端)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Verilator│ │   VCS    │ │  Bebop   │ │   UVM    │  ...      │
│  │  仿真    │ │  仿真    │ │  仿真    │ │  验证    │            │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌──────────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐
│     arch/    │ │  verify/│ │  bebop/ │ │  verify/ │
│  (Scala RTL) │ │  (SV)   │ │ (Rust)  │ │  (UVM)  │
└──────────────┘ └─────────┘ └─────────┘ └──────────┘
        │                                                    
        ▼                                                    
┌─────────────────────┐                                       
│    examples/         │                                       
│  (加速器设计)        │                                       
└─────────────────────┘                                       
```

---

## 6. 数据流

### 6.1 硬件开发流程

```
1. 编写 Chisel 代码 (arch/)
         ↓
2. 生成 Verilog (bbdev mill step)
         ↓
3. RTL 仿真验证 (Verilator/VCS)
         ↓
4. 综合 (Yosys/Design Compiler)
         ↓
5. 布局布线 / 比特流生成
         ↓
6. FPGA 仿真 (FireSim) 或 Tapeout
```

### 6.2 仿真执行流程

```
1. 编译工作负载 (compiler/)
         ↓
2. 选择仿真后端 (BEMU/Verilator/P2E)
         ↓
3. 运行仿真 (bbdev CLI)
         ↓
4. 收集追踪数据 (itrace, mtrace, etc.)
         ↓
5. 性能分析 (bemu_analysis)
```

---

## 7. 快速命令

### 7.1 环境准备

```bash
# 进入 Nix 开发环境
nix develop

# 或使用 flakes
nix develop .#default
```

### 7.2 仿真命令

```bash
# Verilator 仿真
bbdev verilator --run '--jobs 16 --chip toy --binary toy-toy-vecunit_matmul_ones-baremetal --batch'

# Bebop 仿真 (带追踪)
bbdev bebop-verilator --run '--chip toy --binary toy-toy-vecunit_matmul_ones-baremetal --itrace --mtrace --pmctrace --ctrace --banktrace'

# BEMU 快速仿真
bbdev bemu --run '--chip toy --binary toy-toy-vecunit_matmul_ones-baremetal'
```

### 7.3 工作负载构建

```bash
# 构建工作负载
bbdev workload --build --chip toy --workload matmul

# 转换为十六进制
bbdev workload --tohex --chip toy --workload matmul
```

---

## 8. 关键配置文件

| 文件 | 位置 | 说明 |
|------|------|------|
| `flake.nix` | 根目录 | Nix 环境定义，包含所有 EDA 工具 |
| `Cargo.toml` | `bebop/` | Rust 工作空间配置 |
| `pyproject.toml` | `bbdev/api/` | Python 项目依赖 |
| `package.json` | `bbdev/api/` | Node.js API 服务依赖 |
| `ip.toml` | `verify/uvm/` | IP 验证配置 |
| `chip.toml` | `arch/` | Chip 配置参数 |

---

## 9. 开发工作流

### 9.1 添加新的加速器

1. 在 `examples/balls/` 创建新的加速器模块
2. 编写 Chisel 代码实现加速器逻辑
3. 在 `arch/framework/balldomain/` 注册加速器
4. 添加 UVM 验证测试用例 (`verify/`)
5. 编写参考工作负载 (`bb-tests/`)
6. 在 `bbdev` 添加自动化步骤

### 9.2 运行验证

```bash
# 构建 UVM 测试
bbdev uvm --build --test blink_test

# 运行 UVM 测试
bbdev uvm --run --test blink_test
```

### 9.3 性能回归测试

```bash
# 构建比特流
bbdev regression --buildbitstream --chip toy

# 运行回归测试
bbdev regression --check --models matmul,conv2d
```

---

## 10. 依赖工具

### 10.1 必需工具

| 工具 | 版本 | 用途 |
|------|------|------|
| Rust | stable | Bebop 仿真框架 |
| Scala | 2.12+ | Chisel 硬件描述 |
| Mill | latest | Scala 构建工具 |
| Nix | 2.15+ | 环境管理 |
| Verilator | 5.0+ | RTL 仿真 |

### 10.2 可选工具

| 工具 | 用途 |
|------|------|
| VCS | 商业 RTL 仿真 |
| Design Compiler | 逻辑综合 |
| PrimeTime PX | 功耗分析 |
| FireSim | FPGA 仿真 |
| Vivado/Vitis | FPGA 开发 |

---

## 11. 总结

Buckyball 是一个完整的领域特定架构开发平台，涵盖从硬件描述、仿真、验证到部署的全流程。其模块化设计使得：

- **研究人员** 可以快速原型化新的加速器
- **开发者** 可以使用统一的工具链管理项目
- **AI Agent** 可以通过 MCP 接口自动化工作流

项目使用 Nix 进行环境管理，确保所有依赖的可复现性。通过 Rust 编写的仿真框架提供了高效、跨平台的仿真能力。

---

## 附录 A: 目录清单

```
buckyball/
├── arch/                    # 硬件架构 (Scala/Chisel)
│   ├── framework/
│   │   ├── balldomain/     # Ball ISA 加速器
│   │   ├── gpdomain/       # 通用处理域
│   │   ├── memdomain/      # 内存域
│   │   ├── mem-core/       # 互联核心
│   │   ├── rvv/           # RISC-V 向量
│   │   ├── root/          # ROOT 互联
│   │   └── system/        # 系统集成
│   └── sims/              # 仿真配置
├── bebop/                   # Rust 仿真框架
│   ├── src/
│   │   ├── nodes/          # 仿真节点
│   │   │   ├── bemu/      # BEMU 仿真器
│   │   │   ├── verilator/ # Verilator 后端
│   │   │   └── p2e/       # FPGA 后端
│   │   ├── simulation/    # 仿真抽象
│   │   └── lib/           # 共享库
│   └── tests/             # 测试
├── bbdev/                   # 开发者工具链
│   ├── api/               # API 服务
│   │   ├── steps/         # 工作流步骤
│   │   ├── services/      # 服务层
│   │   └── utils/         # 工具函数
│   └── mcp/               # MCP 服务器
├── verify/                  # UVM 验证
│   └── uvm/
│       ├── src/ball/      # Ball 验证组件
│       └── src/ip/        # IP 验证组件
└── examples/               # 参考设计
    ├── chips/             # 芯片配置
    ├── balls/            # 加速器示例
    └── cores/            # CPU 核心
```

---

*报告生成完毕*
