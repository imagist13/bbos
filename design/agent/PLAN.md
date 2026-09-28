# BB-Agent 设计方案

**项目**: BB-Agent — bbos/agent，基于 atrium fork 的 AI 工作台
**版本**: v1.0
**日期**: 2026-09-28
**状态**: 方案阶段，待实施

---

## 1. 背景与设计动机

### 1.1 定位

BBOS 有两个核心界面：

| 界面 | 当前状态 | 定位 |
|------|----------|------|
| **bbos/agent** | 空（待建） | AI 工作台，BB 开发者的主入口 |
| **bbos/gui** | Tauri scaffold（未完成） | TOML 可视化编辑器，按需打开 |

用户日常节奏：

```
打开电脑 → BB-Agent（AI chat）
  ├─ "跑一下 toy 的 verilator 仿真"   → bbdev/mcp
  ├─ "帮我分析 trace 文件"            → bbdev/mcp
  ├─ "这是什么报错"                  → bbdev/mcp
  └─ "我要改 chip.toml"             → [Open EDA] → bbos/gui
      （改完切回 BB-Agent 继续问）
```

**bbos/agent 是前台，bbos/gui 是后台按需调用的编辑器。**

### 1.2 Cursor 模型类比

```
Cursor Desktop
├── Main Window: AI Chat + Editor (webview)
└── [Open Copilot] → 独立 Copilot 面板窗口

BB-Agent
├── Main Window: AI Chat (fork atrium)
└── [Open EDA]   → bbos/gui (Tauri window)
```

区别在于 BB-Agent **不包含编辑器**（不写 Scala/Chisel/SystemVerilog），编辑器由 bbos/gui 单独负责。BB-Agent 只做 AI 对话。

### 1.3 不做的事

- ❌ 不把 bbos/gui 嵌成 BB-Agent 的 webview（两个 app 完全独立进程）
- ❌ 不改 bbos/gui（它按自己的 SPEC 演进）
- ❌ 不重写 AI 引擎（fork atrium，直接复用 pi agent core）

---

## 2. 架构

### 2.1 进程模型

```
┌─────────────────────────────────────────────────────────┐
│  Process A: BB-Agent (Electron, fork atrium)           │
│  ├── Main: Node.js (pi agent core, tRPC, Hono, SQLite) │
│  └── Renderer: React 19 (TanStack Router, hash history) │
│       └─ 主界面：Chat / Sidebar / Settings / Scheduled │
│       └─ 新增：[Open EDA] 按钮 → IPC → shell.openExternal  │
└─────────────────────────────────────────────────────────┘
                           │ http (REST)
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Process B: bb-server (Rust, axum, bb-server 二进制)    │
│  └── 工作区状态 / job 管理 / SSE 日志                   │
└─────────────────────────────────────────────────────────┘
                           │ stdio
                           ▼
┌─────────────────────────────────────────────────────────┐
│  bbdev/mcp (FastMCP, Python)                          │
│  └── 45 个 BB 工具（verilator_run / bemu_sim / ...）  │
└─────────────────────────────────────────────────────────┘
                           │ exec
                           ▼
┌─────────────────────────────────────────────────────────┐
│  bbdev CLI → bebop / arch / verify                    │
└─────────────────────────────────────────────────────────┘
```

### 2.2 窗口关系

```
用户点击 [Open EDA]（BB-Agent Renderer）
    → IPC: window.electron.openEda()
    → BB-Agent Main Process
    → shell.openExternal("bbos-gui://")   （或直接启动 Tauri app）
    → OS 启动 bbos/gui (Tauri window)
```

bbos/gui 不需要常驻后台，用完关掉即可。

### 2.3 数据共享

bbos/agent 和 bbos/gui **不共享进程内存**，通过文件系统共享状态：

| 数据 | 位置 | 访问方 |
|------|------|--------|
| 工作区根目录 | 用户在 BB-Agent Settings 中配置 | agent 读（注入 context） |
| chip.toml / designs/*.toml | `<workspace>/examples/chips/*/configs/` | agent 读（问的时候），gui 写 |
| job 日志 | `~/.bbos/logs/` 或 bb-server | agent 读（展示给用户） |
| bb-server 端口 | 共享在同一台机器，端口随机 | agent 发现并连接 |

---

## 3. Fork 策略

### 3.1 目录结构

```
buckyball/bbos/agent/   ← atrium 的完整 fork，放在 buckyball 仓库内
```

**不用 git submodule**：atrium 后续演进可以直接在 bbos/agent 内 `git merge upstream` 拉取，或者直接 cherry-pick fix。

### 3.2 继承 atrium 的全部能力

| atrium 能力 | BB-Agent 用途 | 处理 |
|-------------|--------------|------|
| pi agent core（引擎） | AI 对话核心 | 直接继承 |
| 33 个内置工具 | 读 trace / 翻 git / 跑 bash | 直接继承 |
| MCP 支持（stdio/HTTP/SSE） | 注册 bbdev/mcp | 直接继承 |
| Skills 系统 | 写 BB 专用 SKILL | 扩展 |
| Memory（含 dream） | 项目知识积累 | 直接继承 |
| Subagent | 并行跑多个工具 | 直接继承 |
| Scheduled tasks | 定时跑仿真回归 | 直接继承 |
| Provider registry | 接入 Anthropic / OpenAI / Gemini 等 | 直接继承 |
| tRPC + SQLite | 配置持久化 | 直接继承 |
| electron-trpc | IPC 通信 | 直接继承 |

### 3.3 需要删除的（atrium 2026-09 已弃用）

| 模块 | 原因 |
|------|------|
| ACP external agents | 引擎迁移已删除整个 ACP 通道 |
| Image generation | 同上 |
| Vercel AI SDK | 已完全移除 |

### 3.4 还要删的（BB v1 不需要）

| 模块 | 原因 |
|------|------|
| `platform/computer-use/` | macOS 独占，BB 调试用不上 |
| `@playwright/mcp` browser-control | macOS Chrome TCC 权限，BB v1 不做 |
| OAuth subscription providers | BB v1 不做联网 AI 账号集成 |

### 3.5 必须新增

| 新增项 | 描述 |
|--------|------|
| `resources/mcp.json` | 默认注册 bbdev/mcp（stdio） |
| `resources/skills/bb-*.md`（5 个） | BB 专用 skill |
| `src/main/bb/` 桥接层 | bb-server 客户端 + workspace context |
| `src/renderer/src/components/bb/` | WorkspaceStatus / JobStatus UI |
| `Open EDA` 按钮 | 调 shell.openExternal 启动 bbos/gui |
| BB 品牌 | icon、欢迎语、术语（中 chip / design / ball / trace） |
| `get-acquainted` skill 改 BB 版 | 问研究方向 / 芯片类型 / 工作流阶段 |

---

## 4. 关键实现细节

### 4.1 [Open EDA] 按钮

**BB-Agent Renderer**（React）：
```tsx
// src/renderer/src/components/sidebar/AgentHeader.tsx
<Button onClick={() => window.electron?.openEda()}>
  Open EDA
</Button>
```

**BB-Agent Main Process**（Node.js）：
```ts
// src/main/index.ts（或新文件 src/main/bb/eda-launcher.ts）
ipcMain.handle('bb:openEda', async () => {
  // 方案 1：直接 shell.openExternal（需要 bbos/gui 注册 URI scheme）
  shell.openExternal('bbos-gui://');
  
  // 方案 2：直接启动 Tauri 二进制（跨平台更稳）
  const guiPath = join(app.getPath('userData'), 'bbos-gui');
  child_process.spawn(guiPath, [], { detached: true });
});
```

**bbos/gui Tauri 端**（`src-tauri/src/main.rs`）：
```rust
// 注册 URI scheme，允许被外部调用激活
#[tauri::command]
fn open_eda(window: tauri::Window) {
    // 在新窗口打开主界面
    tauri::WebviewWindowBuilder::new(&app, "main", ...).build();
}
```

### 4.2 bbdev/mcp 默认注册

`resources/mcp.json`（atrium 的 MCP 配置路径）：

```json
{
  "mcpServers": {
    "buckyball-dev": {
      "command": "python",
      "args": ["-m", "bbdev.mcp"],
      "cwd": "/path/to/buckyball",
      "env": {}
    }
  }
}
```

或者通过 nix：

```json
{
  "mcpServers": {
    "buckyball-dev": {
      "command": "nix",
      "args": ["develop", "-c", "bbdev-mcp"],
      "cwd": "/path/to/buckyball"
    }
  }
}
```

### 4.3 BB Skills

```
resources/skills/
├── bb-overview/
│   └── SKILL.md          # 项目结构 + bbdev 命令速查
├── bb-chip-design/
│   └── SKILL.md          # chip.toml / designs/*.toml 怎么改
├── bb-sim-debug/
│   └── SKILL.md          # 仿真失败排查流程
├── bb-trace-analysis/
│   └── SKILL.md          # iTrace / mTrace / bankTrace 解读
├── bb-ball-isa/
│   └── SKILL.md          # Ball 指令集添加/修改
└── get-acquainted/       # 已存在于 atrium，替换为 BB 版
    └── SKILL.md
```

### 4.4 bb-server 桥接

BB-Agent main process 启动时：

1. 启动 bb-server 作为子进程（`cargo run -p bb-server`）
2. 从 stderr 读取 `LISTENING 127.0.0.1:<PORT>`
3. HTTP 客户端轮询 workspace 状态
4. 状态注入到 system prompt（"当前 chip=toy, job=running, sim=verilator"）

---

## 5. 实施计划

### Phase A：Fork 与可启动（0.5 天）

```bash
# 1. 把 atrium 复制进 bbos/agent
cp -r /path/to/atrium d:/acode/buckyball/bbos/agent

# 2. 重命名
cd bbos/agent
# - package.json name → "bb-agent"
# - electron-builder.yml → "BB-Agent"
# - icon.png → BB 主题图标

# 3. 删除不需要的模块
rm -rf src/main/platform/computer-use/
rm -rf src/main/agent/automation/browser-*   # playwright 相关

# 4. npm install && bun run dev
```

**验收**：BB-Agent 能启动，显示 Chat 界面，Settings 能选 Provider。

### Phase B：bbdev/mcp 接入（0.5 天）

- 写 `resources/mcp.json`，默认注册 bbdev/mcp
- 在 Chat 里问"跑一下 verilator"，验证调用成功
- 验证 bbdev/mcp 的 45 个工具全部可见

**验收**：Agent 能实际跑 `bbdev verilator --run`。

### Phase C：BB Skills（1 天）

- 写 5 个 SKILL.md
- 验证 `skill` 工具读取正确
- 验证 get-acquainted 问 BB 相关问题

**验收**：问"我想添加 GEMMINI_V2 指令"→ Agent 主动读取 bb-ball-isa skill。

### Phase D：bb-server 桥接（1 天）

- 启动 bb-server 子进程
- 读取 LISTENING 端口
- workspace 状态轮询注入 context

**验收**：问"当前打开的是什么 chip"→ 正确回答。

### Phase E：Open EDA 按钮（0.5 天）

- Renderer 加按钮
- Main process 加 IPC handler
- bbos/gui 加 URI scheme / 启动命令
- 端到端：从 BB-Agent 点 Open EDA → bbos/gui 窗口弹出

**验收**：一键从 AI 对话切换到 GUI 编辑。

### Phase F：品牌与收尾（0.5 天）

- BB 主题 icon
- 欢迎语 / 空状态文案
- 术语翻译（中英双语）
- `bbos/agent/CLAUDE.md` 继承 atrium 工程纪律

**总预计：4 天**

---

## 6. 与现有模块的关系

```
buckyball/bbos/
├── agent/         ← 本方案，fork atrium，AI 工作台主入口
├── gui/          ← 现有 Tauri scaffold，TOML 编辑器（独立演进）
├── backend/      ← 现有 Rust sidecar，bb-server（被 agent 调用）
└── design/
    └── agent/
        └── PLAN.md   ← 本文件
```

**没有循环依赖**：agent → backend → bbdev/mcp → bbdev CLI → (reads workspace files) → agent 和 gui 共享文件系统。

---

## 7. 技术栈一览

| 层 | 技术 | 来源 |
|----|------|------|
| 宿主框架 | Electron 39 + electron-vite | atrium |
| 渲染框架 | React 19 + TanStack Router + hash history | atrium |
| AI 引擎 | @earendil-works/pi-agent-core 0.84 | atrium |
| 状态管理 | Zustand 5（renderer stores） | atrium |
| 数据库 | better-sqlite3 + Drizzle ORM | atrium |
| IPC | electron-trpc（CRUD） + Hono HTTP（流式 chat） | atrium |
| AI 协议 | pi（Vercel AI SDK 已删除） | atrium |
| MCP | @modelcontextprotocol/sdk（stdio） | atrium |
| BB 工具 | bbdev/mcp（FastMCP，45 工具） | buckyball/bbdev |
| 后端服务 | bb-server（Rust，axum） | buckyball/bbos/backend |
| 编辑器 | bbos/gui（Tauri v2） | buckyball/bbos/gui |

---

## 8. 变更记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-09-28 | v1.0 | 初稿 |

