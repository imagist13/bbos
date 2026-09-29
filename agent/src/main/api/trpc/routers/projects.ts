import { projectStore } from '@main/conversation/store/projects';
import { BrowserWindow, dialog, type OpenDialogOptions } from 'electron';
import { z } from 'zod';
import { resolveBbRoot } from '@main/platform/bb-root';
import { publicProcedure, router } from '../trpc';

const byId = z.object({ id: z.string() });

export const projectsRouter = router({
  list: publicProcedure.query(() => projectStore().list()),

  /**
   * 确保 BB 项目存在并返回其 id。
   *
   * BB agent 强制每个对话都挂在 buckyball 项目下,所以启动 / 进 home 时
   * 调一次,保证项目行已经在,后续 threads.create 直接拿到 id。
   * 已存在则直接返回(同名路径的项目 store 会复用,见 ProjectStore.add)。
   */
  ensureBb: publicProcedure.query(() => {
    const root = resolveBbRoot();
    const id = projectStore().add(root);
    return { id, root };
  }),

  /** Native folder picker. Returns the chosen absolute path, or null if cancelled. */
  pickDirectory: publicProcedure.mutation(async () => {
    const opts: OpenDialogOptions = { properties: ['openDirectory', 'createDirectory'] };
    const win = BrowserWindow.getFocusedWindow();
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0];
  }),

  add: publicProcedure
    .input(z.object({ path: z.string().min(1) }))
    .mutation(({ input }) => ({ id: projectStore().add(input.path) })),

  rename: publicProcedure
    .input(byId.extend({ name: z.string().min(1) }))
    .mutation(({ input }) => projectStore().rename(input.id, input.name)),

  pin: publicProcedure.input(byId).mutation(({ input }) => projectStore().pin(input.id, true)),

  unpin: publicProcedure.input(byId).mutation(({ input }) => projectStore().pin(input.id, false)),

  archive: publicProcedure.input(byId).mutation(({ input }) => projectStore().archive(input.id)),

  delete: publicProcedure.input(byId).mutation(({ input }) => projectStore().remove(input.id)),
});
