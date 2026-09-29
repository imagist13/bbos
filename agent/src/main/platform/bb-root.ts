/**
 * BB 仓库根目录解析 —— 把"BB 仓库在哪"这件事集中起来,所有需要这个路径
 * 的地方都从这里拿,不再各自硬编码。
 *
 * 优先级:
 *   1. `BB_AGENT_WORKSPACE` 环境变量 —— 显式覆盖,方便打包/分发后切到别的仓库
 *   2. 从 app 根向上走,找到第一个含 `flake.nix` 的目录(buckyball 仓库的标记)
 *   3. 兜底 `process.cwd()`
 *
 * 解析只发生在 main 进程。renderer 通过 tRPC 的 `eda.defaultWorkspace` /
 * `projects.ensureBb` 拿到结果,自己不再做路径解析。
 */

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { app } from 'electron';

const BB_MARKERS = ['flake.nix'] as const;

/** 已经解析过的结果缓存,免得每个 procedure 都重新 stat 整个目录树。 */
let cached: { root: string } | null = null;

/**
 * 向上找最近一个含 BB_MARKERS 中任一标记文件的祖先目录。
 * 找不到返回 null。
 */
function findUpward(start: string): string | null {
  let cur = resolve(start);
  // 兜底上限:64 层,防止意外的 symlink 循环。
  for (let i = 0; i < 64; i++) {
    if (BB_MARKERS.some((m) => existsSync(join(cur, m)))) return cur;
    const parent = dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
  return null;
}

/** 解析 BB 仓库根。同步;只调一次,结果会缓存。 */
export function resolveBbRoot(): string {
  if (cached) return cached.root;

  // 1. 显式 env 优先,允许运维 / 用户自己指定
  const envPath = process.env.BB_AGENT_WORKSPACE?.trim();
  if (envPath && existsSync(envPath)) {
    cached = { root: resolve(envPath) };
    return cached.root;
  }

  // 2. 从 app 根(`app.getAppPath()` = `bbos/agent/`)向上找 marker
  const appRoot = app.getAppPath();
  const fromApp = findUpward(appRoot);
  if (fromApp) {
    cached = { root: fromApp };
    return cached.root;
  }

  // 3. 兜底 cwd —— dev 模式下 cwd 通常就是仓库根
  const fromCwd = findUpward(process.cwd());
  if (fromCwd) {
    cached = { root: fromCwd };
    return cached.root;
  }

  // 4. 实在找不到,给个不会立刻挂掉的兜底。render 端拿到 null 时再退化。
  const fallback = resolve(process.cwd());
  cached = { root: fallback };
  return cached.root;
}
