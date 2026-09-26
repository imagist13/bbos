# BBOS 后端规格书

**项目**: BBOS — Buckyball Desktop IDE
**组件**: `bbos/backend/`（Rust）
**版本**: v0.1
**日期**: 2026-09-26
**状态**: 待实施

---

## 目录

1. [概述](#1-概述)
2. [架构](#2-架构)
3. [crate 结构](#3-crate-结构)
4. [协议层](#4-协议层)
5. [HTTP API](#5-http-api)
6. [进程管理](#6-进程管理)
7. [日志系统](#7-日志系统)
8. [状态与持久化](#8-状态与持久化)
9. [生命周期](#9-生命周期)
10. [错误码](#10-错误码)
11. [安全与权限](#11-安全与权限)
12. [Tauri 集成](#12-tauri-集成)
13. [技术决策](#13-技术决策)

---

## 1. 概述

### 1.1 目标

BBOS 后端（`bbos/backend/`）是 Rust 实现的独立进程，负责：

- 管理工作区（扫描 chip.toml / designs/*.toml）
- 调度 bbdev 子进程（仿真、工作负载构建、UVM 验证）
- 流式推送日志到前端（SSE）
- 提供 HTTP REST API 给 Tauri Renderer 使用

### 1.2 非目标

- ❌ 不实现 AI Agent 逻辑（那是 `bbos/agent/` TS 模块的职责）
- ❌ 不直接操作 Verilog 文件（由 bbdev 通过 arch/ 调用）
- ❌ 不做持久化数据库（job 状态 in-memory，日志落文件）

### 1.3 与其他模块的关系

```
┌─────────────────────────────────────────────────────────────┐
│  Tauri Main Process (Rust)                                  │
│  ├── 拉起 bb-server 进程（sidecar）                         │
│  ├── 通过 HTTP localhost 调用 bb-server API                  │
│  ├── 通过 tauri::event 推送事件到 Renderer                  │
│  └── 持有 bb-server 端口号                                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / tauri::event
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  bb-server (Rust, 独立进程)  ★ 本文档范围                   │
│  ├── HTTP API（axum）                                       │
│  ├── bb-core（业务逻辑，无 IO 边界）                        │
│  └── bb-bbdev（bbdev 子进程网关）                          │
└────────────────────────┬────────────────────────────────────┘
                         │ tokio::process::Command
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  bbdev (bash/nix) + bbdev/mcp (Python)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 架构

### 2.1 进程模型

- **bb-server**：独立进程，自带 Tokio async runtime，不与 Tauri 共享 runtime。
- **bb-core**：`bb-server` 的核心库 crate，无 IO 边界，所有外部依赖通过 trait 注入。
- **bb-bbdev**：`bb-server` 的 bbdev 网关 crate，处理子进程启动、取消、日志解析。

### 2.2 IPC 选型

| 选项 | 选型 | 理由 |
|------|------|------|
| **HTTP localhost** | ✅ | 跨平台、可调试、curl 直接打 |
| Unix socket | 备选 | Linux/macOS 快，Windows 走 named pipe 更复杂 |
| Stdio JSON-RPC | 不采用 | bb-server 已是独立进程，不需要双 stdio 路由 |

**端口发现**：`bb-server` 启动时监听 `0.0.0.0:0`（随机端口），启动完成后 stdout 输出 `LISTENING 127.0.0.1:<PORT>`。Tauri shell 读取该行获取端口，并写入环境变量 `BBOS_BACKEND_PORT` 供后续调用。

---

## 3. crate 结构

```
bbos/backend/
├── Cargo.toml                          # workspace 根
├── rust-toolchain.toml                 # pin stable
├── Cargo.lock
├── .gitignore
├── README.md
├── docs/
│   ├── architecture.md                  # 本文的精炼版
│   ├── jobs.md                         # job 状态机与 SSE 事件说明
│   └── ipc.md                          # HTTP API 端点说明
│
└── crates/
    ├── bb-server/                      # ★ 唯一二进制
    │   ├── Cargo.toml
    │   └── src/
    │       ├── main.rs                 # tokio main, args: --port (default 0=auto)
    │       ├── app.rs                  # Router 装配 + AppState
    │       ├── routes/
    │       │   ├── mod.rs
    │       │   ├── system.rs          # GET /api/health, GET /api/diagnostics
    │       │   ├── projects.rs        # GET /api/projects
    │       │   ├── workspace.rs       # GET /api/workspace/:chip, PUT /api/workspace/:chip
    │       │   ├── jobs.rs            # POST /api/jobs, GET /api/jobs, GET /api/jobs/:id
    │       │   ├── logs.rs            # GET /api/jobs/:id/logs (SSE)
    │       │   └── cancel.rs          # POST /api/jobs/:id/cancel
    │       ├── state.rs                # AppState: Arc<...>
    │       ├── sse.rs                 # 通用 SSE helper
    │       ├── error.rs                # -> protocol::Error
    │       └── lifecycle.rs             # SIGINT/Ctrl-C, graceful shutdown
    │
    ├── bb-core/                        # ★ 业务核心（无 IO 边界）
    │   ├── Cargo.toml
    │   └── src/
    │       ├── lib.rs
    │       ├── project.rs              # ProjectService: list, load_chip, load_design
    │       ├── paths.rs                # canonicalize + 越界检查
    │       ├── config.rs               # chip.toml / design.toml 解析（toml crate）
    │       ├── jobs/
    │       │   ├── mod.rs              # JobStore trait + 内存实现
    │       │   ├── queue.rs            # mpsc + worker pool
    │       │   ├── runner.rs           # JobRunner trait（由 bb-bbdev 实现）
    │       │   ├── status.rs           # 状态机（Pending → Running → Succeeded/Failed/Cancelled）
    │       │   └── log.rs              # stdout/stderr → 文件 + broadcast::Sender
    │       ├── events.rs               # tokio::sync::broadcast 总线（状态变更 + 日志行）
    │       └── tools.rs                # 静态工具清单（bbdev step 名称列表）
    │
    └── bb-bbdev/                       # ★ bbdev 子进程网关
        ├── Cargo.toml
        └── src/
            ├── lib.rs
            ├── cli.rs                  # Command 构造（统一走 nix develop）
            ├── process.rs              # tokio::process::Command 封装
            ├── detect.rs               # 探测 python / nix / bash / bbdev 可用性
            ├── cancel.rs               # Unix process group kill
            ├── codec.rs                # 退出码解析
            └── nix.rs                  # nix develop -c 包装

bbos/protocol/                           # 共享契约（与 backend 同级）
├── Cargo.toml
├── package.json                         # 给 gui 引用 TS 类型
├── tsconfig.json
└── src/
    ├── lib.rs / index.ts               # re-export
    ├── error.rs / error.ts             # 统一错误码
    ├── jobs.rs / jobs.ts               # JobId, JobState, JobKind, JobEvent
    ├── workspace.rs / workspace.ts     # Project, ChipRef, DesignRef
    └── events.rs / events.ts           # SSE event name + payload
```

---

## 4. crate 职责

### 4.1 `bb-server`（二进制）

**职责**：HTTP 入口 + AppState 组装 + 生命周期管理。

```
main.rs
  ├── parse args: --port <u16>（0 = 随机端口）
  ├── logging::init()（tracing-subscriber, 输出到文件 + stderr）
  ├── AppState::new()（构建 bb-core + bb-bbdev 实例）
  ├── router(app) -> bind -> listen
  └── shutdown signal (SIGINT/SIGTERM) -> graceful drain
```

**AppState 包含**：

```rust
pub struct AppState {
    pub project_service: ProjectService,
    pub job_store: Arc<JobStoreImpl>,
    pub bbdev: Arc<BbdevGateway>,
    pub events: broadcast::Sender<BackendEvent>,
    pub shutdown_tx: broadcast::Sender<()>,
}
```

### 4.2 `bb-core`（库）

**职责**：业务逻辑，不持有网络连接或子进程。所有 IO 通过 trait 抽象。

**核心 trait**：

```rust
// 作业运行器（由 bb-bbdev 实现）
pub trait JobRunner: Send + Sync {
    async fn run(&self, job: Job, log_tx: LogSender) -> Result<JobExit, RunError>;
    async fn cancel(&self, job_id: JobId) -> Result<(), CancelError>;
}

// 项目服务（自己实现，不依赖外部）
pub trait ProjectService: Send + Sync {
    fn list_projects(&self, root: &Path) -> Vec<Project>;
    fn load_chip(&self, path: &Path) -> Result<ChipConfig, ConfigError>;
    fn save_chip(&self, path: &Path, config: &ChipConfig) -> Result<(), ConfigError>;
    fn load_design(&self, path: &Path) -> Result<DesignConfig, ConfigError>;
    fn save_design(&self, path: &Path, config: &DesignConfig) -> Result<(), ConfigError>;
}
```

### 4.3 `bb-bbdev`（库）

**职责**：bbdev 子进程生命周期。

**检测顺序**（`detect.rs`）：

1. `nix develop .#default -c bbdev --version`（优先，用户已入 Nix 环境）
2. `bbdev --version`（PATH 中直接有）
3. 失败 → 返回 `BbdevUnavailable { reason: String }`

**命令构造**（`cli.rs`）：

```rust
pub struct BbdevCommand {
    pub args: Vec<String>,
    pub working_dir: PathBuf,
}

impl BbdevCommand {
    pub fn verilator_run(chip: &str, binary: &str, extra: &[&str]) -> Self { ... }
    pub fn workload_build(chip: &str, workload: &str) -> Self { ... }
    pub fn to_spawn(&self) -> tokio::process::Command { ... }
}
```

---

## 5. HTTP API

### 5.1 端点总览

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/diagnostics` | 系统诊断（bbdev 可用性、bbdev 版本、bb-server 版本） |
| GET | `/api/projects` | 列出工作区下的所有 chip |
| GET | `/api/workspace/:chip` | 获取 chip 完整配置（chip.toml + designs/*.toml） |
| PUT | `/api/workspace/:chip` | 保存 chip 配置（chip.toml + design.toml） |
| POST | `/api/jobs` | 发起一个新 job |
| GET | `/api/jobs` | 列出所有 job |
| GET | `/api/jobs/:id` | 获取单个 job 状态 |
| GET | `/api/jobs/:id/logs` | SSE 日志流 |
| POST | `/api/jobs/:id/cancel` | 取消 job |

### 5.2 请求/响应格式

所有请求/响应 Content-Type 为 `application/json`。

**错误响应格式**（与 `bbos/protocol/` 一致）：

```json
{
  "code": "JOB_NOT_FOUND",
  "message": "Job 'abc123' does not exist",
  "detail": null
}
```

### 5.3 `POST /api/jobs` 详解

**请求体**：

```json
{
  "kind": "verilator_run",
  "chip": "toy",
  "binary": "toy-toy-vecunit_matmul_ones-baremetal",
  "args": ["--jobs", "16", "--batch"],
  "workspace_root": "/path/to/buckyball"
}
```

**`kind` 枚举**：

```typescript
type JobKind =
  | { type: 'verilator_run'; chip: string; binary: string; extra_args?: string[] }
  | { type: 'workload_build'; chip: string; workload: string }
  | { type: 'bemu_run'; chip: string; binary: string }
  | { type: 'uvm_build'; test: string }
  | { type: 'uvm_run'; test: string }
  | { type: 'generic'; args: string[] }  // 直接透传 args 给 bbdev
```

**响应**（201 Created）：

```json
{
  "id": "job-abc123def",
  "kind": "verilator_run",
  "state": "pending",
  "created_at": "2026-09-26T12:00:00Z",
  "chip": "toy",
  "binary": "toy-toy-vecunit_matmul_ones-baremetal"
}
```

### 5.4 `GET /api/jobs/:id/logs`（SSE）详解

**SSE 事件类型**：

| 事件名 | payload | 说明 |
|--------|---------|------|
| `log` | `{ line: string; stream: 'stdout' \| 'stderr'; ts: string }` | 单行日志 |
| `state` | `{ state: JobState; exit_code: number \| null }` | 状态变更 |
| `error` | `{ code: string; message: string }` | 系统错误（非 job 失败） |

**示例**：

```
event: log
data: {"line":"[10:23:45] Starting: bbdev verilator --run --chip toy","stream":"stdout","ts":"2026-09-26T10:23:45Z"}

event: log
data: {"line":">>> [Progress: 50%] Running test...","stream":"stdout","ts":"2026-09-26T10:23:50Z"}

event: state
data: {"state":"succeeded","exit_code":0}

event: log
data: {"line":"Exit code: 0","stream":"stdout","ts":"2026-09-26T10:25:30Z"}
```

---

## 6. 进程管理

### 6.1 启动

```rust
async fn run_job(job: Job, log_tx: LogSender) -> Result<JobExit, RunError> {
    let mut cmd = BbdevCommand::from_job(&job).to_spawn();

    // 设置工作目录
    cmd.current_dir(job.workspace_root);

    // Unix: 创建进程组（支持 kill -PGID 递归杀子进程）
    #[cfg(unix)] {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0); // 子进程继承同一进程组
    }

    let mut child = cmd.spawn().map_err(RunError::Spawn)?;

    // 读取 stdout/stderr（分开 buffer）
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    // 两个异步任务并发读取
    let log_tx1 = log_tx.clone();
    let stdout_task = tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Some(Ok(line)) = reader.next_line().await {
            log_tx1.send(LogEntry { stream: Stream::Stdout, line, ts: Utc::now() }).ok();
        }
    });
    // stderr 同上

    // 等待退出码
    let status = child.wait().await.map_err(RunError::Wait)?;
    let _ = stdout_task.await;
    let _ = stderr_task.await;

    Ok(JobExit { code: status.code(), ts: Utc::now() })
}
```

### 6.2 取消

- Unix：用 `process_group(0)` 创建进程组，取消时 `kill(-pgid, SIGTERM)` 递归杀所有子进程。
- bbdev 通常会 fork/exec verilator 子进程，单独 kill 主进程杀不掉子进程。

### 6.3 超时

Job 结构可选 `timeout_secs: Option<u64>`。超时时自动调用 cancel 并标记为 `Cancelled`。

---

## 7. 日志系统

### 7.1 日志落文件

```
~/.local/share/bbos/logs/jobs/<job_id>.log
~/.local/share/bbos/logs/bb-server.log   (bb-server 自身日志)
```

### 7.2 日志文件格式

```
[2026-09-26T10:23:45.123Z] [stdout] [10:23:45] Starting: bbdev verilator --run --chip toy
[2026-09-26T10:23:46.456Z] [stdout] >>> [Progress: 50%] Running test...
[2026-09-26T10:25:30.789Z] [stderr] Error: file not found
```

### 7.3 日志行缓冲

每个 job 的 stdout/stderr 通过 `tokio::io::BufReader::lines()` 逐行读取，写入文件的同时 `broadcast::Sender` 推送给 SSE 订阅者。

```
JobLogWriter
  ├── file: BufWriter<File>    # 追加到 job log 文件
  ├── tx: broadcast::Sender<LogEntry>  # 推送给 SSE
  └── flush on each line
```

---

## 8. 状态与持久化

### 8.1 Job 状态机

```
Pending ──(worker pick)──► Running ──(exit 0)──► Succeeded
                             │
                             ├──(exit != 0)──► Failed
                             │
                             ├──(cancel)────► Cancelled
                             │
                             └──(timeout)────► Cancelled
```

### 8.2 JobStore trait

```rust
pub trait JobStore: Send + Sync {
    fn submit(&self, job: Job) -> JobId;
    fn get(&self, id: &JobId) -> Option<Job>;
    fn list(&self) -> Vec<Job>;
    fn update_state(&self, id: &JobId, state: JobState, exit_code: Option<i32>);
    fn remove(&self, id: &JobId);  // 保留文件，只删内存
}
```

**Phase C 实现**：内存 HashMap。Phase D 预留 trait 接口以切换到 SQLite。

### 8.3 项目数据

- 不做持久化数据库。chip.toml / designs/*.toml 直接读写文件系统。
- `ProjectService` 维护 `root: PathBuf`，所有路径基于 root 做 canonicalize 后校验越界。

---

## 9. 生命周期

### 9.1 启动

```rust
// bb-server main.rs
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_target(false)
        .init();

    let args = Args::parse();

    // 构建 AppState
    let state = AppState::new().await?;

    // 启动 HTTP server（随机端口）
    let port = state.config.port;
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    let (shutdown_tx, shutdown_rx) = broadcast::channel::<()>(1);

    // SIGINT/SIGTERM -> 发送 shutdown signal
    tokio::spawn(async move {
        tokio::signal::ctrl_c().await.ok();
        let _ = shutdown_tx.send(());
    });

    tracing::info!("bb-server v{} listening on {}", env!("CARGO_PKG_VERSION"), addr);
    eprintln!("LISTENING 127.0.0.1:{}", addr.port()); // Tauri 读取此行

    let server = axum::Server::bind(&addr)
        .serve(app(state.clone()).into_make_service())
        .with_graceful_shutdown(async move {
            shutdown_rx.recv().await.ok();
        });

    server.await?;
    tracing::info!("bb-server stopped");
    Ok(())
}
```

### 9.2 Tauri sidecar 集成

Tauri 主进程（Rust）负责：

1. 查找 `bb-server` 二进制路径（`$RESOURCE/bb-server` 或 `~/.local/bin/bb-server`）
2. `Command::new(bb_server_path).arg("--port").arg("0").spawn()`
3. 读取 stdout 直到 `LISTENING 127.0.0.1:<PORT>`
4. 轮询 `http://127.0.0.1:<PORT>/api/health`，读到 200 后通知前端
5. 持有 `Child` 句柄，窗口关闭时 `kill()` + `wait()`

```rust
// Tauri src-tauri/src/main.rs（示意）
async fn start_backend() -> Result<u16, String> {
    let server_path = tauri::api::path::resource_dir()
        .map(|p| p.join("bb-server"))
        .unwrap_or_else(|| PathBuf::from("bb-server"));

    let mut child = Command::new(&server_path)
        .arg("--port").arg("0")
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let mut line = String::new();
    child.stdout.as_mut().unwrap().read_line(&mut line).ok();
    let port: u16 = line.trim().split(':').last().unwrap().parse().unwrap();

    // 等待健康
    for _ in 0..30 {
        if reqwest::get(format!("http://127.0.0.1:{}/api/health")).await.is_ok() {
            return Ok(port);
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    Err("bb-server health check timeout".into())
}
```

---

## 10. 错误码

所有错误码定义在 `bbos/protocol/src/error.rs`，bb-server 直接使用：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `INTERNAL_ERROR` | 500 | 内部未分类错误 |
| `BBDEV_UNAVAILABLE` | 503 | bbdev 检测失败 |
| `WORKSPACE_NOT_FOUND` | 404 | 工作区根目录不存在 |
| `CHIP_NOT_FOUND` | 404 | chip.toml 不存在 |
| `DESIGN_NOT_FOUND` | 404 | design.toml 不存在 |
| `CONFIG_PARSE_ERROR` | 422 | TOML 解析失败（包含行号） |
| `JOB_NOT_FOUND` | 404 | job ID 不存在 |
| `JOB_ALREADY_CANCELLED` | 409 | job 已在取消中 |
| `JOB_NOT_RUNNING` | 409 | cancel 时 job 不在 running 状态 |
| `PERMISSION_DENIED` | 403 | 路径越界（工作区外） |
| `INVALID_REQUEST` | 400 | 请求格式或参数错误 |

---

## 11. 安全与权限

### 11.1 路径白名单

所有文件操作必须先经过 `paths::canonicalize_and_authorize(root, user_path)`：

```rust
pub fn canonicalize_and_authorize(root: &Path, user_path: &Path) -> Result<PathBuf, PathError> {
    // 1. 拼接 root + user_path
    // 2. canonicalize（解析 symlink、..）
    // 3. 验证结果前缀是 root 的 canonicalize 结果
    // 4. 失败返回 PERMISSION_DENIED
}
```

### 11.2 bbdev 命令审计

每个 job 启动时记录：

```json
{
  "job_id": "...",
  "timestamp": "...",
  "cwd": "...",
  "cmd": ["bbdev", "verilator", "--run", "..."],
  "user": "...",
  "hostname": "..."
}
```

写进 `~/.local/share/bbos/logs/audit.jsonl`。

### 11.3 Tauri capabilities

`tauri.conf.json` 只暴露必要的 capabilities：

```json
{
  "$schema": "...",
  "identifier": "main",
  "windows": ["main"],
  "capabilities": [
    {
      "identifier": "main-capability",
      "windows": ["main"],
      "permissions": [
        "core:default",
        "shell:allow-execute",
        "http:default",
        "notification:default",
        "path:default"
      ]
    }
  ]
}
```

---

## 12. Tauri 集成

### 12.1 构建配置

`tauri.conf.json` 相关字段：

```json
{
  "productName": "bbos",
  "identifier": "com.buckyball.bbos",
  "bundle": {
    "externalBin": [
      "binaries/bb-server-x86_64-unknown-linux-gnu"
    ]
  }
}
```

### 12.2 端口发现流程

```
bb-server 启动 → stdout "LISTENING 127.0.0.1:53412" → Tauri 读取 → 写入 window state
→ Renderer 通过 tauri://store 或 IPC 获取端口 → reqwest 调用 /api/*
```

### 12.3 Renderer 调用方式

```typescript
// gui/src/lib/tauri.ts
const getBackendUrl = () => {
  const port = await invoke<number>('get_backend_port');
  return `http://127.0.0.1:${port}`;
};

// 调用示例
const resp = await fetch(`${getBackendUrl()}/api/projects`);
const projects = await resp.json();
```

---

## 13. 技术决策

| 决策 | 选型 | 理由 |
|------|------|------|
| **HTTP 框架** | axum + tower | Tokio 生态、与 Tauri 独立进程契合 |
| **Async runtime** | Tokio | Rust 异步标准 |
| **TOML 解析** | toml crate | 保留注释，Rust 生态成熟 |
| **日志** | tracing + tracing-subscriber | 结构化、零成本抽象 |
| **序列化** | serde + serde_json | 事实标准 |
| **进程取消** | Unix process group | bbdev fork 子进程必须用进程组杀 |
| **SSE** | axum SSE helper | 原生支持，backpressure 友好 |
| **协议共享** | `bbos/protocol/` crate | Rust + TS 双输出，TS 通过 `package.json` 发布 |
| **测试策略** | 单元测试 + 假 bbdev fixture | 不依赖真实 Nix/bbdev，CI 快速跑通 |

---

## 附录 A：共享类型索引

`bbos/protocol/src/` 中定义、backend 和 gui 共用的类型：

| 文件 | 核心类型 |
|------|---------|
| `error.rs` | `Error { code, message, detail }` |
| `jobs.rs` | `JobId, JobState, JobKind, Job, JobEvent, LogEntry` |
| `workspace.rs` | `Project, ChipConfig, DesignConfig, TileConfig` |
| `events.rs` | `SseEvent, SseEventName` |

---

*规格书版本 v0.1 — 2026-09-26*
