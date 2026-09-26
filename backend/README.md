# BBOS Backend

BBOS 后端 — Rust 实现的 HTTP 服务器，作为 Tauri desktop app 的 sidecar 运行。

## 角色

- 管理工作区（扫描 chip.toml / designs/*.toml）
- 调度 bbdev 子进程
- 流式推送日志到前端（SSE）
- 提供 HTTP REST API 给 Tauri Renderer

## crate 结构

```
backend/
├── Cargo.toml              # workspace 根
└── crates/
    ├── bb-server/          # 唯一二进制（axum HTTP server）
    ├── bb-core/            # 业务核心（无 IO 边界）
    └── bb-bbdev/           # bbdev 子进程网关
```

## 编译运行

```bash
# 编译
cargo build -p bb-server

# 运行（默认随机端口，stderr 输出 LISTENING 行）
cargo run -p bb-server -- --port 0

# 测试
cargo test --workspace
```

## HTTP API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/diagnostics` | bbdev 状态诊断 |
| GET | `/api/projects?root=<path>` | 列出工作区下的所有 chip |
| GET | `/api/workspace/{chip}?root=<path>` | 获取 chip 完整配置 |
| PUT | `/api/workspace/{chip}` | 保存 chip 配置 |
| POST | `/api/jobs` | 发起一个新 job |
| GET | `/api/jobs` | 列出所有 job |
| GET | `/api/jobs/{id}` | 获取单个 job 状态 |
| GET | `/api/jobs/{id}/logs` | SSE 日志流 |
| POST | `/api/jobs/{id}/cancel` | 取消 job |

## 端口发现

`bb-server` 启动时绑定到 `127.0.0.1:0`（随机端口），启动后通过 **stderr** 输出：

```
LISTENING 127.0.0.1:<PORT>
```

Tauri 主进程读取这一行获取端口。

## 当前状态

✅ 已完成 Step 1-5：
- [x] S1：`bb-server` 启动 + `/api/health` 200
- [x] S2：`/api/projects` 列出 chip
- [x] S3：`/api/workspace/{chip}` GET/PUT
- [x] S4：`/api/jobs` POST 提交 + 内存 store
- [x] S5：SSE 日志流路由（`/api/jobs/{id}/logs`）
- [x] S6：Cancel 路由（`/api/jobs/{id}/cancel`）
- [x] 优雅关闭（SIGINT → broadcast::Sender）
- [ ] Worker pool 实际运行 bbdev
- [ ] Tauri sidecar 集成
- [ ] 集成测试（fake bbdev fixture）

## 测试

```bash
# 单元测试
cargo test -p bb-core --lib

# 端到端测试
cd bbos/backend
cargo run -p bb-server -- --port 0 &
curl http://127.0.0.1:<port>/api/health
```

## 关联文档

- [`../design/backend/spec.md`](../design/backend/spec.md) — 规格书
- [`../design/backend/dev.md`](../design/backend/dev.md) — 开发计划
- [`../design/SPEC.md`](../design/SPEC.md) — 总体规格书
