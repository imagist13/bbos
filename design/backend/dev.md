# BBOS 后端开发计划

**项目**: BBOS — Buckyball Desktop IDE
**组件**: `bbos/backend/`（Rust）
**版本**: v0.1
**日期**: 2026-09-26
**依赖**: `spec.md`（先读）

---

## 1. 目标与验收标准

### 1.1 总体目标

实现 `bbos/backend/`，使 BBOS GUI 能：

1. 扫描 `buckyball/` 仓库下的 chip 列表并展示
2. 加载和保存 `chip.toml` / `designs/*.toml`
3. 通过 `bbdev` 运行仿真并实时推送日志
4. 取消正在运行的仿真
5. 优雅关闭 bb-server，不丢日志

### 1.2 验收标准

| 里程碑 | 标准 |
|--------|------|
| **S1: 能跑** | `cargo run -p bb-server` 启动、端口打印到 stdout、`curl http://127.0.0.1:<port>/api/health` 返回 200 |
| **S2: 项目列表** | `GET /api/projects?root=/path/to/buckyball` 返回 chip 列表 |
| **S3: TOML 读写** | `GET /api/workspace/:chip` 返回 chip + designs 数据；`PUT` 保存后磁盘文件内容正确 |
| **S4: 仿真运行** | `POST /api/jobs` 发起 `bbdev verilator --version` → 状态变 `succeeded` |
| **S5: 日志流** | `GET /api/jobs/:id/logs` SSE 实时推送日志行 |
| **S6: 取消** | `POST /api/jobs/:id/cancel` 后进程树真死、状态变 `cancelled` |
| **S7: Tauri 集成** | Tauri GUI 启动后 bb-server 作为 sidecar 拉起、前端能调通 API |

---

## 2. 实施顺序

```
Step 1  · 骨架（workspace + bb-server hello world）
Step 2  · 协议层（bbos/protocol/ Rust + TS）
Step 3  · bb-core 基础（ProjectService + paths + config）
Step 4  · Job 状态机 + 内存 store
Step 5  · HTTP API 路由（system / projects / workspace）
Step 6  · bb-bbdev（detect + process + cancel）
Step 7  · Job 提交 + worker pool + 日志落文件
Step 8  · SSE 日志流
Step 9  · Job 取消路由
Step 10 · 优雅关闭 + SIGINT
Step 11 · Tauri sidecar 集成
Step 12 · 集成测试（fake bbdev fixture）
```

---

## 3. 详细任务

### Step 1 · 骨架

**目标**：Cargo workspace + 空 axum 路由 + `cargo run` 能起来。

```
bbos/backend/
├── Cargo.toml                    # workspace 根，members: [crates/bb-server, crates/bb-core, crates/bb-bbdev]
├── rust-toolchain.toml            # stable
├── crates/
│   ├── bb-server/
│   │   ├── Cargo.toml            # name = "bb-server", path = "crates/bb-server"
│   │   └── src/main.rs           # 空 axum，GET /api/health 返回 {"version": "0.1.0"}
│   ├── bb-core/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs            // pub mod error; pub mod project; pub mod jobs; pub mod events;
│   └── bb-bbdev/
│       ├── Cargo.toml
│       └── src/lib.rs            // pub mod detect; pub mod process; pub mod cli;
```

**Cargo.toml（workspace 根）**：

```toml
[workspace]
resolver = "2"
members = ["crates/bb-server", "crates/bb-core", "crates/bb-bbdev"]

[workspace.package]
version = "0.1.0"
edition = "2021"
authors = ["Buckyball Team"]

[workspace.dependencies]
tokio = { version = "1", features = ["full"] }
axum = "0.8"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
toml = "0.8"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
thiserror = "2"
anyhow = "1"
```

**bb-server/Cargo.toml**：

```toml
[package]
name = "bb-server"
version.workspace = true

[dependencies]
bb-core = { path = "../bb-core" }
axum.workspace = true
tokio.workspace = true
serde_json.workspace = true
tracing.workspace = true
anyhow.workspace = true
```

**main.rs**：

```rust
use axum::{routing::get, Router};
use serde_json::json;

#[tokio::main]
async fn main() {
    let app = Router::new().route("/api/health", get(health));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    eprintln!("LISTENING 127.0.0.1:{}", port);
    axum::serve(listener, app).await.unwrap();
}

async fn health() -> axum::Json<serde_json::Value> {
    axum::Json(json!({ "version": env!("CARGO_PKG_VERSION") }))
}
```

**验收**：

```bash
cd bbos/backend
cargo build
cargo run -p bb-server &
# 读 stdout 中的 LISTENING 行
PORT=$(cargo run -p bb-server 2>&1 | grep LISTENING | grep -oP ':\K\d+')
curl http://127.0.0.1:$PORT/api/health
# 期望: {"version":"0.1.0"}
```

---

### Step 2 · 协议层

**目标**：`bbos/protocol/` 双语言类型定义，backend 和 GUI 共用。

```
bbos/protocol/
├── Cargo.toml
├── package.json                 # name: "@bbos/protocol", version: "0.1.0"
├── tsconfig.json
├── src/
│   ├── lib.rs                  # re-export mod error, jobs, workspace, events
│   ├── error.rs                # ErrorCode, BbosError
│   ├── jobs.rs                 // JobId, JobState, JobKind, Job, LogEntry
│   ├── workspace.rs            // Project, ChipRef, DesignRef, ChipConfig, DesignConfig
│   └── events.rs               // SseEventName, SseEvent
└── ts/
    ├── index.ts                // re-export
    ├── error.ts
    ├── jobs.ts
    ├── workspace.ts
    └── events.ts
```

**核心类型**（`jobs.rs`）：

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Job {
    pub id: JobId,
    pub kind: JobKind,
    pub state: JobState,
    pub created_at: chrono::DateTime<Utc>,
    pub chip: Option<String>,
    pub binary: Option<String>,
    pub workspace_root: PathBuf,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum JobState {
    Pending,
    Running,
    Succeeded,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum JobKind {
    #[serde(rename = "verilator_run")]
    VerilatorRun { chip: String, binary: String, extra_args: Vec<String> },
    #[serde(rename = "workload_build")]
    WorkloadBuild { chip: String, workload: String },
    #[serde(rename = "bemu_run")]
    BemuRun { chip: String, binary: String },
    #[serde(rename = "uvm_build")]
    UvmBuild { test: String },
    #[serde(rename = "uvm_run")]
    UvmRun { test: String },
    #[serde(rename = "generic")]
    Generic { args: Vec<String> },
}
```

**TS 输出**：`bbos/protocol/ts/` 通过 `package.json` 的 `exports` 暴露给 `bbos/gui/` 直接 `import`。

**验收**：`cargo build -p @bbos/protocol`（如果用 wasm-bindgen）或 `cargo check`；TS 端 `pnpm --filter @bbos/protocol run build`。

---

### Step 3 · bb-core 基础

**目标**：`ProjectService` + `paths` + `config` 模块，让 `GET /api/projects` 和 `GET/PUT /api/workspace/:chip` 跑通。

**`bb-core/src/paths.rs`**：

```rust
/// 拼接 + canonicalize 后验证前缀在 root 内。
pub fn canonicalize_and_authorize(
    root: &Path,
    user_path: &Path,
) -> Result<PathBuf, PathError>;

/// 列出 root 下所有包含 chip.toml 的子目录。
pub fn discover_chips(root: &Path) -> Vec<PathBuf>;
```

**`bb-core/src/config.rs`**：

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChipConfig {
    pub designs: DesignInclude,
    pub sims: SimTargets,
    pub uvm: Option<UvmConfig>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DesignConfig {
    pub top: TopConfig,
    pub tiles: Vec<TileConfig>,
}

pub fn parse_chip(content: &str) -> Result<ChipConfig, ConfigError>;
pub fn parse_design(content: &str) -> Result<DesignConfig, ConfigError>;
pub fn serialize_chip(c: &ChipConfig) -> Result<String, ConfigError>;
pub fn serialize_design(c: &DesignConfig) -> Result<String, ConfigError>;
```

**`bb-core/src/project.rs`**：

```rust
pub struct ProjectService {
    root: PathBuf,
}

impl ProjectService {
    pub fn new(root: PathBuf) -> Self { ... }
    pub fn list_chips(&self) -> Result<Vec<ChipRef>, ProjectError>;
    pub fn load_chip(&self, name: &str) -> Result<ChipConfig, ConfigError>;
    pub fn save_chip(&self, name: &str, config: &ChipConfig) -> Result<(), ConfigError>;
    pub fn load_design(&self, chip: &str, name: &str) -> Result<DesignConfig, ConfigError>;
    pub fn save_design(&self, chip: &str, name: &str, config: &DesignConfig) -> Result<(), ConfigError>;
}
```

**验收**：

```bash
# 假设 buckyball 仓库在 /path/to/buckyball
curl "http://127.0.0.1:$PORT/api/projects?root=/path/to/buckyball"
# 期望: ["toy", "pebble", ...]

curl "http://127.0.0.1:$PORT/api/workspace/toy?root=/path/to/buckyball"
# 期望: chip.toml + designs/*.toml 内容

# 改 nTiles，PUT 后磁盘文件内容验证
```

---

### Step 4 · Job 状态机 + 内存 store

**目标**：提交 job 后内存中有记录，状态变更有广播。

**`bb-core/src/jobs/mod.rs`**：

```rust
pub struct JobStoreImpl {
    jobs: RwLock<HashMap<JobId, Job>>,
    events: broadcast::Sender<JobEvent>,
}

pub trait JobStore: Send + Sync {
    fn submit(&self, job: Job) -> JobId;
    fn get(&self, id: &JobId) -> Option<Job>;
    fn list(&self) -> Vec<Job>;
    fn update_state(&self, id: &JobId, state: JobState, exit_code: Option<i32>);
}

pub enum JobEvent {
    StateChanged { id: JobId, state: JobState, exit_code: Option<i32> },
    LogLine { id: JobId, entry: LogEntry },
}
```

**`bb-core/src/jobs/status.rs`**：定义状态转换合法性校验。

**验收**：单元测试验证 `Pending→Running→Succeeded` 合法路径，`Pending→Cancelled` 合法，`Running→Pending` 非法。

---

### Step 5 · HTTP API 路由

**目标**：所有只读/项目管理路由完成。

| 路由 | 状态 |
|------|------|
| `GET /api/health` | Step 1 已完成 |
| `GET /api/diagnostics` | 待做（返回 bbdev 可用性） |
| `GET /api/projects` | 待做 |
| `GET /api/workspace/:chip` | 待做 |
| `PUT /api/workspace/:chip` | 待做 |
| `POST /api/jobs` | Step 7 |
| `GET /api/jobs` | Step 7 |
| `GET /api/jobs/:id` | Step 7 |
| `GET /api/jobs/:id/logs` | Step 8 |
| `POST /api/jobs/:id/cancel` | Step 9 |

**`routes/projects.rs`**：

```rust
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/projects", get(list_projects))
        .route("/api/workspace/:chip", get(get_workspace).put(put_workspace))
}

async fn list_projects(
    Query(params): Query<HashMap<String, String>>,
    State(s): State<AppState>,
) -> Result<Json<Value>, AppError> {
    let root = params.get("root").ok_or(AppError::MissingParam("root"))?;
    let chips = s.project_service.list_chips()
        .map_err(AppError::Internal)?;
    Ok(Json(json!({ "chips": chips })))
}
```

---

### Step 6 · bb-bbdev

**目标**：`detect` + `cli` + `process` 三个模块，`BbdevGateway::run()` 能拉起真实 bbdev 并拿到 stdout。

**`bb-bbdev/src/detect.rs`**：

```rust
#[derive(Debug)]
pub enum BbdevStatus {
    Available { version: String, path: PathBuf },
    Unavailable { reason: String },
}

pub async fn detect() -> BbdevStatus {
    // 1. nix develop .#default -c bbdev --version
    // 2. bbdev --version
    // 3. bash bbdev --version
    // 返回第一个成功的版本信息
}
```

**`bb-bbdev/src/cli.rs`**：

```rust
impl BbdevCommand {
    pub fn from_kind(kind: &JobKind, workspace_root: &Path) -> Self { ... }
    pub fn to_spawn(&self) -> tokio::process::Command { ... }
}
```

**`bb-bbdev/src/process.rs`**：

```rust
pub struct BbdevProcess {
    child: tokio::process::Child,
    job_id: JobId,
}

impl BbdevProcess {
    pub async fn spawn(cmd: &BbdevCommand) -> Result<Self, RunError>;
    pub async fn wait_with_logs(&mut self, log_tx: LogSender) -> Result<JobExit, RunError>;
    pub fn kill_group(&self) -> Result<(), CancelError>;
}
```

**验收**：

```rust
#[tokio::test]
async fn test_bbdev_version() {
    let status = bb_bbdev::detect().await;
    assert!(matches!(status, BbdevStatus::Available { .. }));
}
```

---

### Step 7 · Job 提交 + worker pool + 日志落文件

**目标**：`POST /api/jobs` 真正跑起 bbdev，状态变 `Running`，日志落磁盘。

**Worker pool**：

```rust
pub struct JobWorkerPool {
    sender: mpsc::Sender<Job>,
    bbdev: Arc<dyn JobRunner>,
    log_dir: PathBuf,
}

impl JobWorkerPool {
    pub fn new(bbdev: Arc<dyn JobRunner>, log_dir: PathBuf, concurrency: usize) -> Self {
        // 启动 concurrency 个 worker 协程
        // 每个 worker: loop { let job = receiver.recv().await; run(job); }
    }
}
```

**日志落文件**：

```rust
async fn write_job_log(log_dir: &Path, job_id: &JobId, entry: &LogEntry) -> std::io::Result<()> {
    let path = log_dir.join(format!("{job_id}.log"));
    let mut file = OpenOptions::new().create(true).append(true).open(path).await?;
    writeln!(file, "[{}] [{}] {}", entry.ts.to_rfc3339(), entry.stream.as_str(), entry.line).await
}
```

**验收**：

```bash
curl -X POST http://127.0.0.1:$PORT/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"kind":{"type":"generic","args":["verilator","--version"]},"workspace_root":"/path/to/buckyball"}'
# 期望: 201, state: "succeeded", exit_code: 0
# 同时检查 ~/.local/share/bbos/logs/jobs/<id>.log 文件存在
```

---

### Step 8 · SSE 日志流

**目标**：`GET /api/jobs/:id/logs` 通过 SSE 推送日志行。

**`bb-server/src/routes/logs.rs`**：

```rust
async fn job_logs(
    Path(id): Path<String>,
    State(s): State<AppState>,
) -> impl IntoResponse {
    let mut receiver = s.job_store.subscribe_logs(&id);
    let stream = async_stream::stream! {
        while let Some(entry) = receiver.recv().await {
            yield Event::default()
                .event("log")
                .data(serde_json::to_string(&entry).unwrap());
        }
    };
    EventStream::new(stream)
}
```

**验收**：

```bash
# job 运行中
curl -N "http://127.0.0.1:$PORT/api/jobs/$JOB_ID/logs"
# 期望: 能实时看到 event: log 行
```

---

### Step 9 · Job 取消路由

**目标**：`POST /api/jobs/:id/cancel` 能杀掉进程树。

**`bb-server/src/routes/cancel.rs`**：

```rust
async fn cancel_job(
    Path(id): Path<String>,
    State(s): State<AppState>,
) -> Result<Json<Value>, AppError> {
    s.job_runner.cancel(&id).map_err(AppError::from)?;
    s.job_store.update_state(&id, JobState::Cancelled, None);
    Ok(Json(json!({ "id": id, "state": "cancelled" })))
}
```

**验收**：

```bash
# 发起一个长时间 job（如 bbdev verilator --run 真实仿真）
# 另开窗口 cancel
curl -X POST "http://127.0.0.1:$PORT/api/jobs/$JOB_ID/cancel"
# 检查进程树：pgrep -g <pgid> 应为空
# 检查状态：GET /api/jobs/$JOB_ID 返回 state: "cancelled"
```

---

### Step 10 · 优雅关闭

**目标**：SIGINT 后等所有 running job 完成后退出，不杀仍在跑的 job。

```rust
// main.rs
let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(());

tokio::spawn(async move {
    tokio::signal::ctrl_c().await.ok();
    tracing::info!("Received Ctrl+C, initiating graceful shutdown...");
    // 不再接受新 job
    // 等所有 running job 完成（或超时 30s）
    drop(shutdown_tx);
});

let server = axum::Server::bind(&addr)
    .serve(app(state).into_make_service())
    .with_graceful_shutdown(async {
        shutdown_rx.changed().await.ok();
    });
```

**验收**：`SIGINT` 后 bb-server 在 30s 内退出，`curl /api/health` 在 shutdown 后返回 503。

---

### Step 11 · Tauri sidecar 集成

**目标**：`bbos/gui/src-tauri/src/main.rs` 启动 bb-server 作为 sidecar，Renderer 能调通 API。

**任务**：

1. 在 `tauri.conf.json` 中添加 `"bundle": { "externalBin": ["binaries/bb-server"] }`
2. 在 `src-tauri/src/main.rs` 中实现 `start_bb_server()` 函数（见 `spec.md §9.2`）
3. `AppState` 中存储 backend 端口，暴露 `get_backend_port` Tauri command
4. GUI 启动后 `useEffect` 调用 `invoke('get_backend_port')`，然后调 `/api/*`

**验收**：运行 Tauri GUI，DevTools Network 面板能看到 `/api/health` 200。

---

### Step 12 · 集成测试

**目标**：CI 中用 fake bbdev fixture 跑通所有 API 端点。

**Fake bbdev**（Shell 脚本，不依赖 Nix）：

```bash
#!/bin/bash
# bbdev fake 放在 tests/fake_bbdev.sh
if [[ "$*" == *"version"* ]]; then
    echo "bbdev version 1.0.0 fake"
    exit 0
fi
if [[ "$*" == *"verilator"* ]] && [[ "$*" == *"--run"* ]]; then
    echo "[Progress: 25%] Loading..."
    sleep 1
    echo "[Progress: 50%] Running..."
    sleep 1
    echo "[Progress: 100%] Done"
    exit 0
fi
exit 1
```

**测试文件**：

```
backend/tests/
├── app_lifecycle.rs          # 启动 / health / 优雅退出
├── project_list.rs           # GET /api/projects
├── job_run.rs                # POST /api/jobs → fake bbdev
├── log_streaming.rs          # SSE 行为
├── cancel.rs                 # cancel 杀进程
└── fake_bbdev.rs             # fake bbdev fixture setup/teardown
```

**验收**：`cargo test --workspace` 全部 green。

---

## 4. 测试策略

| 层 | 工具 | 范围 |
|----|------|------|
| **单元** | `cargo test` | `bb-core`/`bb-bbdev` 纯函数 |
| **集成** | `cargo test --test *` | HTTP 端点，假 bbdev fixture |
| **手工** | `curl` + 浏览器 | 端到端验证 |

**CI 不跑 Nix**：`detect` 在 CI 中 mock（见 `bb-bbdev/src/detect.rs` 的 `#[cfg(test)]`）。

---

## 5. 每日日志模板

```markdown
## Day X: YYYY-MM-DD

### 今日目标
- [ ] 任务 1
- [ ] 任务 2

### 完成情况
- [x] 任务 1 - 描述
- [ ] 任务 2 - 未完成原因

### 遇到的问题
- 问题描述及解决方案

### 明日计划
- [ ] 任务 3
- [ ] 任务 4
```

---

## 6. 参考文件

| 文件 | 用途 |
|------|------|
| `spec.md` | 本设计的规格定义 |
| `bbos/design/SPEC.md` | 总体规格书 |
| `bbos/design/frontend/demo/ecos-studio/ecos/gui/packages/shared/src/contracts/backendWorkspace.ts` | ECOS 后端合约参考 |
| `bbos/design/frontend/demo/ecos-studio/ecos/gui/packages/shared/src/contracts/desktopAgent.ts` | ECOS Agent 合约参考 |
| `bbos/design/PROJECT_ANALYSIS.md` | Buckyball 项目结构 |

---

## 7. 变更记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-09-26 | v0.1 | 初稿，写入 `bbos/design/backend/` |

---

*开发计划版本 v0.1 — 2026-09-26*
