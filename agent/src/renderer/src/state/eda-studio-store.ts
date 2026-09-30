import { create } from 'zustand';

/**
 * EDA 工作台 tab + chip/ball 选择状态。
 *
 * v0.4 页面切到按 skill 维度:
 *   overview   ─ 总览:当前 chip + active jobs + skill 入口
 *   chips      ─ 芯片:chip 列表 + chip.toml / designs / tiles / scala targets
 *   balls      ─ Ball:ball 列表 + 每个 ball 的 5-stage gate 看板
 *   waveforms  ─ 波形:VCD/FST 列表 + waveform-mcp 调用面板
 *
 * tab 选择持久化(localStorage),chip/ball 选择不持久化(切走再回来重选)。
 *
 * ## bb-server 数据
 *
 * v0.4 阶段 bb-server.exe 缺失,Overview/Chips/Balls/Waveforms 需要的数据(chip
 * 列表 / job 状态 / ball 状态 / VCD 文件)目前都用 mock 数据,放在
 * `edaStudio/lib/bb-mock.ts`。bb-server 落地后改成真数据接入,**store 不变**。
 */

export type StudioPage = 'overview' | 'chips' | 'balls' | 'waveforms' | 'advanced';

const STORAGE_KEY = 'bb-agent-eda-studio';

type StudioStore = {
  activePage: StudioPage;
  setActivePage: (page: StudioPage) => void;

  workspace: string | null;
  setWorkspace: (path: string | null) => void;

  /** 选中的 chip(Overview / Chips 页共用)。 */
  currentChip: string | null;
  setCurrentChip: (chip: string | null) => void;

  /** 选中的 ball(Balls 页)。 */
  currentBall: string | null;
  setCurrentBall: (ball: string | null) => void;

  /** 文件浏览器抽屉(Overview 的 file-explorer skill 入口触发)。 */
  fileDrawerOpen: boolean;
  setFileDrawerOpen: (open: boolean) => void;
};

type PersistedShape = {
  activePage?: StudioPage;
  workspace?: string | null;
};

const isStudioPage = (v: unknown): v is StudioPage =>
  v === 'overview' ||
  v === 'chips' ||
  v === 'balls' ||
  v === 'waveforms' ||
  v === 'advanced';

const safeRead = (): Partial<PersistedShape> => {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    const obj = parsed as Record<string, unknown>;
    const out: Partial<PersistedShape> = {};
    if (isStudioPage(obj.activePage)) out.activePage = obj.activePage;
    if (typeof obj.workspace === 'string' || obj.workspace === null) {
      out.workspace = obj.workspace as string | null;
    }
    return out;
  } catch {
    return {};
  }
};

const initial = safeRead();

export const useStudioStore = create<StudioStore>((set) => ({
  activePage: initial.activePage ?? 'overview',
  setActivePage: (page) => {
    set({ activePage: page });
    if (typeof localStorage !== 'undefined') {
      try {
        const cur = safeRead();
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...cur, activePage: page } satisfies PersistedShape),
        );
      } catch {
        // ignore
      }
    }
  },

  workspace: initial.workspace ?? null,
  setWorkspace: (path) => {
    set({ workspace: path });
    if (typeof localStorage !== 'undefined') {
      try {
        const cur = safeRead();
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...cur, workspace: path } satisfies PersistedShape),
        );
      } catch {
        // ignore
      }
    }
  },

  currentChip: null,
  setCurrentChip: (chip) => {
    // 选 chip 时重置 ball 选择(避免旧 chip 的 ball 残留)
    set({ currentChip: chip, currentBall: null });
  },

  currentBall: null,
  setCurrentBall: (ball) => set({ currentBall: ball }),

  fileDrawerOpen: false,
  setFileDrawerOpen: (open) => set({ fileDrawerOpen: open }),
}));