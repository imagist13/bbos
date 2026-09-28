import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    /** BB-Agent native APIs (IPC bridge to main process). */
    bb: {
      /** Open the BB-EDA GUI (bbos/gui Tauri app) in a separate window. */
      openEda: () => Promise<void>;
    };
    api: unknown;
  }
}
