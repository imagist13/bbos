/**
 * EDA Workbench 专用的 tRPC router。
 *
 * 三个 procedure:
 *   - pickWorkspace  弹原生 folder picker,返回绝对路径或 null
 *   - listFiles      递归列出工作区里 EDA 关心的文件(.toml / .canvas / .vcd / .csv)
 *   - readFile       读 utf8 文本,带扩展名校验
 *
 * 设计要点:
 *   - 走 Electron 的 `dialog` / Node 的 `fs`,只能从 main 进程访问
 *   - listFiles 只渲染 EDA 关心的扩展名,避免把 node_modules 之类的大目录扫进 UI
 *   - MAX_DEPTH=6,跳过常见的 build / VCS 目录
 *   - 不引入 store / db,纯只读,刷新即重新扫描
 */

import { BrowserWindow, dialog, type OpenDialogOptions } from 'electron';
import { readdirSync, readFileSync, statSync, watch, writeFileSync, type FSWatcher } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

import { badRequest } from '../errors';
import { publicProcedure, router } from '../trpc';

type FileKind = 'toml' | 'canvas' | 'vcd' | 'csv';

const SUPPORTED_EXTS = ['.toml', '.canvas', '.vcd', '.csv'] as const;
const MAX_DEPTH = 6;
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'target',
  '.next',
  'out',
  'dist',
  '.cache',
  '.turbo',
  '.vite',
  '__pycache__',
]);

interface TreeNode {
  name: string;
  /** 绝对路径(基于父目录的完整路径),渲染端用它来 open + read。 */
  path: string;
  type: 'dir' | 'file';
  kind?: FileKind;
  children?: TreeNode[];
}

function extKind(name: string): FileKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.toml')) return 'toml';
  if (lower.endsWith('.canvas')) return 'canvas';
  if (lower.endsWith('.vcd')) return 'vcd';
  if (lower.endsWith('.csv')) return 'csv';
  return null;
}

function walk(root: string, dir: string, depth: number): TreeNode[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: TreeNode[] = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      const children = depth >= MAX_DEPTH ? [] : walk(root, abs, depth + 1);
      // 叶子目录里没有任何匹配文件就丢掉,避免空目录噪音。
      if (children.length === 0 && depth >= MAX_DEPTH) continue;
      out.push({ name: e.name, path: abs, type: 'dir', children });
    } else if (e.isFile()) {
      const kind = extKind(e.name);
      if (!kind) continue;
      out.push({ name: e.name, path: abs, type: 'file', kind });
    }
  }
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return out;
}

export const edaRouter = router({
  /** 弹系统原生 folder picker,返回用户选择的绝对路径,取消则 null。 */
  pickWorkspace: publicProcedure.mutation(async () => {
    const win = BrowserWindow.getFocusedWindow();
    const opts: OpenDialogOptions = { properties: ['openDirectory'] };
    const res = win
      ? await dialog.showOpenDialog(win, opts)
      : await dialog.showOpenDialog(opts);
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0];
  }),

  /** 递归列出指定目录下 EDA 关心的文件,组装成树。 */
  listFiles: publicProcedure
    .input(z.object({ path: z.string().min(1) }))
    .query(({ input }) => {
      let stat;
      try {
        stat = statSync(input.path);
      } catch {
        throw badRequest(`Path not found: ${input.path}`);
      }
      if (!stat.isDirectory()) throw badRequest(`Not a directory: ${input.path}`);
      return walk(input.path, input.path, 0);
    }),

  /** 读 utf8 文本内容,扩展名必须落在支持集内。 */
  readFile: publicProcedure
    .input(z.object({ path: z.string().min(1) }))
    .query(({ input }) => {
      const kind = extKind(input.path);
      if (!kind) {
        throw badRequest(
          `Unsupported extension. Supported: ${SUPPORTED_EXTS.join(', ')}`,
        );
      }
      let text: string;
      try {
        text = readFileSync(input.path, 'utf8');
      } catch (err) {
        throw badRequest(`Failed to read ${input.path}: ${(err as Error).message}`);
      }
      return { path: input.path, content: text, kind };
    }),

  /**
   * 开始监听一个 workspace 目录的文件变化。同一时间只有一个 active watcher;
   * 重复调用会替换之前的。
   */
  startWatching: publicProcedure
    .input(z.object({ path: z.string().min(1) }))
    .mutation(({ input }) => {
      if (activeWatcher) {
        activeWatcher.watcher.close();
        activeWatcher = null;
      }
      let stat;
      try {
        stat = statSync(input.path);
      } catch {
        throw badRequest(`Path not found: ${input.path}`);
      }
      if (!stat.isDirectory()) throw badRequest(`Not a directory: ${input.path}`);

      const watcher = watch(
        input.path,
        { recursive: true },
        (eventType, filename) => {
          // filename 在不同平台 / Node 版本下可能是 string | Buffer | null。
          if (!filename) return;
          const name = typeof filename === 'string' ? filename : String(filename);
          broadcastFsEvent({
            type: eventType === 'rename' ? 'rename' : 'change',
            path: join(input.path, name),
          });
        },
      );
      watcher.on('error', (err) => {
        // 监听失败时不抛(已经订阅了),只打 log;前端不需感知。
        // eslint-disable-next-line no-console
        console.warn('[eda] watcher error:', err);
      });
      activeWatcher = { root: input.path, watcher };
      return { watching: true, root: input.path };
    }),

  /** 停止当前 workspace 的 watcher(若有)。 */
  stopWatching: publicProcedure.mutation(() => {
    if (activeWatcher) {
      activeWatcher.watcher.close();
      activeWatcher = null;
    }
    return { watching: false };
  }),

  /** 写 utf8 文本内容,扩展名必须落在支持集内。 */
  writeFile: publicProcedure
    .input(z.object({ path: z.string().min(1), content: z.string() }))
    .mutation(({ input }) => {
      const kind = extKind(input.path);
      if (!kind) {
        throw badRequest(
          `Unsupported extension. Supported: ${SUPPORTED_EXTS.join(', ')}`,
        );
      }
      try {
        writeFileSync(input.path, input.content, 'utf8');
      } catch (err) {
        throw badRequest(`Failed to write ${input.path}: ${(err as Error).message}`);
      }
      return { ok: true, path: input.path };
    }),
});

// Re-export for convenience so other modules can use the FileKind type
// without reaching into this file's internals.
export type { FileKind, TreeNode };

/* -------------------------------------------------------------------------- */
/*  File watcher                                                              */
/* -------------------------------------------------------------------------- */

// 一个进程只有一个当前 workspace 的 watcher;切换 workspace 时关掉旧的。
let activeWatcher: { root: string; watcher: FSWatcher } | null = null;
const FS_EVENT_CHANNEL = 'eda:fs-event';

function broadcastFsEvent(payload: { type: 'change' | 'rename'; path: string }): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(FS_EVENT_CHANNEL, payload);
    }
  }
}