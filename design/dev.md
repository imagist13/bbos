# BBOS 云端化开发计划

**项目**: BBOS — Buckyball Desktop IDE
**组件**: `bbos/agent/`(Electron AI 工作台)从本地走向云端
**版本**: v0.1
**日期**: 2026-09-29
**依赖**: `bbos/agent/` 现有代码,`bbos/backend/`(Rust bb-server)
**状态**: 方案阶段,待实施

---

## 1. 目标与验收标准

### 1.1 总体目标

让 `bbos/agent` 在不丧失现有能力的前提下,既能**本地**用(Electron 桌面),也能**云端**用(浏览器访问远端 BB 仓库)。核心代码**只写一份**,不维护 Electron 版和 Web 版两套。

### 1.2 验收标准


| 里程碑                               | 标准                                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **S1: Core 拆分完成**                 | `src/core/` 是纯 Node 模块,无 `import 'electron'`,独立 `node` 跑得起来                                                            |
| **S2: Electron 模式无回归**            | `bun run dev` 启动 Electron 客户端,行为与现状完全一致(chat / skills / MCP / EDA)                                                     |
| **S3: fs / shell / watcher 抽象完成** | `LocalFsBackend` / `LocalShellBackend` / `LocalWatcherBackend` 三个实现落位,所有调用点不再直接 `require('node:fs')` / `child_process` |
| **S4: HTTP/WS 入口**                | `core/bin/server.ts` 启动后监听端口,同源浏览器打开 `http://localhost:<port>` 可用                                                      |
| **S5: 单 build 双模式**               | 一个 Vite build 产物,运行时根据 `window.__BB_MODE__` 选 tRPC transport                                                           |
| **S6: 云端可用**                      | 一台 Linux 云机器,BB 仓库和 agent 同机部署;任意电脑浏览器访问 `https://agent.example.com` 可用                                                |
| **S7: 流式 chat**                   | Cloud 模式下,streaming / tool-call / subagent 都能通过 WebSocket 实时回放                                                         |




### 1.3 非目标(本期不做)

- ❌ 多租户 / per-user 隔离(留给 Phase 4)
- ❌ Bash 沙箱(假设可信环境)
- ❌ 把 bb-server(Rust)容器化
- ❌ 改 bbos/gui(Tauri 独立演进)

---



## 2. 关键设计决策(必须先定)



### 2.1 BB 仓库位置:与 agent **同机**


| 选项              | 优                                                          | 劣                                | 结论       |
| --------------- | ---------------------------------------------------------- | -------------------------------- | -------- |
| **同机部署**        | 零延迟、watcher 直接用 `inotify`、shell 直接 `exec`、无 SFTP / SSH 复杂度 | 占一台机器                            | ✅ **采用** |
| 分机部署 + SSH/SFTP | 灵活                                                         | 跨机 watcher 难、bash 高延迟、SSH 密钥管理复杂 | ❌        |




### 2.2 目标用户:单实例 / 小团队

本期按 **单用户 / 小团队** 设计,不做多租户隔离。auth 用单一 secret token(短期),后续接 SSO。

### 2.3 Renderer 模式:单 build + 运行时切换 transport

```ts
// src/renderer/src/lib/trpc.ts
const link = window.__BB_MODE__ === 'electron'
  ? ipcLink()                                      // 现状 electron-trpc
  : httpBatchLink({ url: '/trpc' })                // 浏览器模式
        .concat(httpSubscriptionLink({ url: '/trpc/ws' }));  // 流式走 WS
```

不维护两套 build / 两份 router。

### 2.4 沙箱:Phase 1-3 不做

假设开发者环境可信,bash 工具直接 `child_process.spawn`。Phase 4 再上 docker-in-docker 或 firecracker。

---



## 3. 目标架构



### 3.1 三层

```
┌──────────────────────────────────────────────────────────────┐
│  Presentation 层                                              │
│   ├── Electron 模式(本地):BrowserWindow 渲染当前 React       │
│   └── Browser  模式(云端):同 React,加 web mode                │
├──────────────────────────────────────────────────────────────┤
│  Transport 层                                                 │
│   ├── Electron: electron-trpc / ipc                          │
│   └── Browser:  tRPC over HTTP + WS subscription link        │
├──────────────────────────────────────────────────────────────┤
│  Core(纯 Node,与 Electron 解耦)                                │
│   ├── tRPC routers(file / eda / projects / chat / settings)  │
│   ├── Agent runtime / Skills / MCP / Memory / Subagent       │
│   ├── SQLite(Drizzle 库 <sqlite>)+ pi-session-backend        │
│   └── Backend switch:                                        │
│       ├── LocalFsBackend / LocalShellBackend / LocalWatcher │
│       └── RemoteFsBackend / RemoteShellBackend / RemoteWatcher │
└──────────────────────────────────────────────────────────────┘
```



### 3.2 目录重组

```
bbos/agent/
├── src/
│   ├── core/                ← 新建,纯 Node,无 electron
│   │   ├── api/trpc/        ← 从 main/api/trpc/ 移过来
│   │   ├── agent/           ← 从 main/agent/ 移过来
│   │   ├── db/              ← 从 main/db/ 移过来
│   │   ├── conversation/    ← 从 main/conversation/ 移过来
│   │   ├── backends/
│   │   │   ├── fs/{local,remote}.ts
│   │   │   ├── shell/{local,remote}.ts
│   │   │   └── watcher/{local,remote}.ts
│   │   └── bin/server.ts    ← Phase 2 新增,启动 core + HTTP/WS
│   ├── main/                ← Electron 薄壳
│   │   ├── index.ts         ← 启动 core,挂 IPC 桥
│   │   ├── menu-bar.ts
│   │   └── platform/        ← Electron 特有(menu / tray / native dialog)
│   ├── preload/
│   └── renderer/            ← 不动主体,只调整 transport
├── electron.vite.config.ts  ← 不动
├── package.json             ← 加 scripts: "dev:server" / "start:server"
└── tsconfig.json            ← 加 paths "@core/*" → "src/core/*"
```



### 3.3 通信通道

**Electron 模式**(现状保留):

```
Renderer  ──ipc──▶  preload  ──ipc──▶  main  ──in-proc──▶  core
                            electron-trpc 自动桥接
```

**Browser 模式**(新增):

```
Browser  ──fetch/WS──▶  nginx/caddy  ──proxy──▶  core/bin/server.ts
                                                     │
                                                     ├─ HTTP tRPC @ /trpc
                                                     └─ WebSocket @ /trpc/ws
```

---



## 4. 实施步骤

按风险从低到高,每步都有独立可验证的产物。

### Phase 1 — Core 物理拆分(目标:不破坏现状,完成解耦)

**预计**:1~2 周

#### Step 1.1 · 抽 fs 抽象

新建 `src/core/backends/fs/`:

```ts
// src/core/backends/fs/types.ts
export interface FsBackend {
  read(path: string): Promise<Uint8Array>;
  write(path: string, data: Uint8Array | string): Promise<void>;
  readdir(path: string): Promise<DirEntry[]>;
  stat(path: string): Promise<FileStat>;
  exists(path: string): Promise<boolean>;
  // ...
}

// src/core/backends/fs/local.ts
export class LocalFsBackend implements FsBackend {
  // 包 node:fs
}
```

把 `src/main/api/trpc/routers/eda.ts`、`src/main/platform/bb-root.ts`、所有 `node:fs` 直接调用点改成走 `FsBackend`。

**验收**:`grep -r "from 'node:fs'" src/main/` 在 router 内为 0;`grep -r "from '@core/backends/fs'"` > 0。

#### Step 1.2 · 抽 shell 抽象

新建 `src/core/backends/shell/`:

```ts
export interface ShellBackend {
  spawn(opts: {
    cmd: string;
    args: string[];
    cwd?: string;
    env?: Record<string, string>;
  }): AsyncIterable<ShellEvent>;  // stdout / stderr / exit
  kill(pid: number): Promise<void>;
}
```

把 `Bash` 工具、`bb-server` sidecar 启动、`bbdev` 调用全部走 `ShellBackend`。

#### Step 1.3 · 抽 watcher 抽象

```ts
export interface WatcherBackend {
  watch(paths: string[], cb: (event: WatchEvent) => void): Disposable;
}
```

`node:fs.watch` 包成 `LocalWatcherBackend`。

#### Step 1.4 · main 改成 Electron 桥

`src/main/index.ts` 不再直连 tRPC / DB / fs:

```ts
// 启动方式:fork core 子进程,通过 stdio JSON-RPC
const core = fork(resolve(__dirname, '../core/bin/main.js'), [], {
  stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
});
```

或者更简单——既然 main 本来就是 Node,直接把 core **内联 require**,只把 Electron 特有的事件(`app.on('ready')`、`ipcMain.handle('bb:openEda')`、tray / menu)留在 main。

推荐方案:**main 内联 core**(改动更小,IPC 还是用 `electron-trpc` 直连 core 实例)。

```ts
// src/main/index.ts
import { createApp } from '@core/app';           // 纯 Node 函数
import { app, BrowserWindow, ipcMain } from 'electron';
import electronTRPC from 'electron-trpc';

const core = createApp({ backend: 'local' });

app.whenReady().then(() => {
  // 现状:electron-trpc router 直接 attach ipcMain
  // 改成:把 core 的 router attach 到 ipcMain
  electronTRPC.createIPCHandler({ router: core.router });
  createWindow();
});
```

**验收**:`bun run dev` 启动,所有现有功能(chat / EDA / Open EDA 按钮 / bbdev/mcp)行为不变。

---



### Phase 2 — Browser 入口(目标:同机启 server,浏览器能跑)

**预计**:1 周

#### Step 2.1 · 起 core server

`src/core/bin/server.ts`:

```ts
import { createApp } from '../app';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { applyWSSHandler } from '@trpc/server/adapters/ws';

const app = createApp({ backend: 'local' });

const httpHandler = createHTTPHandler({ router: app.router });
const wsHandler = applyWSSHandler({ router: app.router, ctx: app.ctx });

const server = http.createServer(httpHandler);
server.listen(3000, () => console.log('core listening on :3000'));
```



#### Step 2.2 · tRPC client 双模式

```ts
// src/renderer/src/lib/trpc.ts
const mode = window.__BB_MODE__ ?? 'electron';

const links = mode === 'electron'
  ? [ipcLink()]
  : [
      httpBatchLink({ url: '/trpc' }),
      ...(trpcClientSubscriptionLink
        ? [trpcClientSubscriptionLink({ url: `${wsUrl}/trpc/ws` })]
        : []),
    ];

export const trpc = createTRPCReact<AppRouter>({
  links,
});
```

`window.__BB_MODE__` 由 Electron 启动时注入,或由浏览器 fallback 读 `import.meta.env.VITE_BB_MODE`。

**验收**:同台机器启 `bun run dev:server`,浏览器访问 `http://localhost:3000`,打开 chat,问"读 `hw/dsa/buckyball.v`",agent 返回内容。

#### Step 2.3 · Renderer 移除 Electron 强依赖

把 `window.electron.openEda()` 这种调用改成兼容写法:

```ts
function openEda() {
  if (window.electron?.openEda) {
    window.electron.openEda();        // Electron 模式
  } else {
    window.open('bbos-gui://', '_blank');  // Browser 模式
  }
}
```

把 `electron-conf` 的设置改写进 tRPC settings router(用 SQLite,跟 chat / skills 一起)。

---



### Phase 3 — 云端部署(目标:真上云)

**预计**:2 周

#### Step 3.1 · 部署清单

```ini
# systemd / Docker 一份
[Service]
Environment=BB_MODE=server
Environment=BB_BACKEND=local              # 同机 fs
Environment=BB_WORKSPACE=/opt/buckyball   # BB 仓库根
Environment=BB_DB_PATH=/var/lib/bb-agent/agent.db
Environment=BB_PORT=3000
Environment=BB_AUTH_TOKEN=<随机长串>
ExecStart=/usr/bin/node /opt/bb-agent/core/bin/server.js
```



#### Step 3.2 · 反向代理 + HTTPS

caddy 一段就够:

```
agent.buckyball.dev {
    reverse_proxy localhost:3000
}
```



#### Step 3.3 · Renderer 部署

- 方案 A:**Renderer 也部署到云**(和 core 同源),浏览器访问 `https://agent.buckyball.dev` 直接拿到 SPA
- 方案 B:**Renderer 走 Vercel / CDN**,跨域访问 `core`(需配 CORS / cookie)

推荐方案 A,简单。

#### Step 3.4 · Auth

短期 `Authorization: Bearer <BB_AUTH_TOKEN>` header,客户端首次访问 `/login?token=...` 写 cookie。

中期接 OAuth / SSO。

#### Step 3.5 · bbdev 接入

云上 `PATH` 里要有 `bbdev`(nix develop 或直接二进制),`BB_WORKSPACE` 指 `/opt/buckyball`,`Mcp` 子进程能 `spawn` 起来。

---



### Phase 4 — 多租户 + 沙箱(本期不做,留 spec)

- Per-user 隔离:`data/users/<userId>/agent.db`
- Bash 沙箱:`nsjail` / `docker exec` per-session
- Skills / instructions 按用户命名空间
- Resource limits:CPU / mem / disk per session

---



## 5. 关键文件改动清单


| 文件                                       | 动作                                      | Phase |
| ---------------------------------------- | --------------------------------------- | ----- |
| `src/main/index.ts`                      | 改成只挂 Electron 事件 + 调 `createApp()`      | P1    |
| `src/main/api/trpc/router.ts`            | 移进 `src/core/api/trpc/router.ts`        | P1    |
| `src/main/api/trpc/routers/eda.ts`       | 改成走 `FsBackend`                         | P1    |
| `src/main/api/trpc/routers/projects.ts`  | 改成走 `FsBackend`                         | P1    |
| `src/main/platform/bb-root.ts`           | 改成走 `FsBackend`                         | P1    |
| `src/main/agent/tools/builtins/bash.ts`  | 改成走 `ShellBackend`                      | P1    |
| `src/main/conversation/store/*`          | 改 SQLite 路径走 env                        | P1    |
| `src/main/agent/sandbox/*`(文件 watcher)   | 改成走 `WatcherBackend`                    | P1    |
| `src/core/backends/{fs,shell,watcher}/*` | **新建**                                  | P1    |
| `src/core/bin/server.ts`                 | **新建**,HTTP + WS 入口                     | P2    |
| `src/renderer/src/lib/trpc.ts`           | 加 mode 判断 + 选 link                      | P2    |
| `src/renderer/src/components/**/use*.ts` | 把 `window.electron.*` 调用加 fallback      | P2    |
| `electron.vite.config.ts`                | 加 `BB_MODE` 注入                          | P2    |
| `package.json`                           | 加 `dev:server` / `start:server` scripts | P2    |
| `Dockerfile` / `systemd unit`            | **新建**                                  | P3    |
| `caddy` / `nginx` 配置                     | **新建**                                  | P3    |


---



## 6. 风险与缓解


| 风险                                     | 影响                               | 缓解                                            |
| -------------------------------------- | -------------------------------- | --------------------------------------------- |
| `electron-trpc` 不能直接复用                 | Phase 1 内联 core 失败,得引入 stdio IPC | 提前做 spike:在 main 里直接 import core 看能不能用        |
| SQLite `app.getPath('userData')` 写死在多处 | Cloud 模式无 userData 目录            | 统一从 env 读 `BB_DB_PATH`,Phase 1 改完             |
| File watcher 在 Electron 主进程            | Browser 模式下 watcher 怎么传到前端       | 用 WS subscribe model,后端 watcher → push 事件     |
| bb-server(Rust sidecar)在云端冲突端口         | 同机多个 agent 起端口冲突                 | 加 `BB_PORT_RANGE` env,随机可用端口                  |
| MCP(stdio)子进程在云端 PATH 没 bbdev          | Agent 调不到工具                      | 文档化部署要求(需要 `bbdev` 可用)                        |
| Streaming chat 在 WebSocket 上中转延迟       | 用户体验变差                           | 走 `httpSubscriptionLink` over WS,实测延迟 < 100ms |


---



## 7. 测试策略


| 测试               | Phase | 内容                                         |
| ---------------- | ----- | ------------------------------------------ |
| 单元测试(`bun test`) | P1    | `LocalFsBackend` / `LocalShellBackend` 各接口 |
| 集成测试             | P2    | 同机 server + 浏览器,完成"读文件 → chat → 写文件"端到端    |
| 回归测试             | P1/P2 | Electron 模式行为不变(手动 + 关键路径自动)               |
| 端到端              | P3    | 云上部署 + 任意机器浏览器访问,完成一个完整 agent 任务           |


---



## 8. 实施总时间表

```
Week) 1-2   Phase 1  Core 拆分 + fs/shell/watcher 抽象 + Electron 模式无回归
Week 3     Phase 2  HTTP/WS 入口 + Renderer 双模式
Week 4-5   Phase 3  云端部署 + auth + bbdev 接入 + 端到端验证
Week 6+    Phase 4  多租户 + 沙箱(后续 spec
```

---



## 9. 变更记录

| 日期 | 版本 | 变更 |
|---|---|
| 2026-09-29 | v0.1 | 初稿 |