import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    /** BB-Agent native APIs (IPC bridge to main process). */
    bb: {
      /** Open the BB-EDA GUI (bbos/gui Tauri app) in a separate window. */
      openEda: () => Promise<void>;
      /**
       * Subscribe to file-system change events emitted by the EDA workbench
       * watcher. Returns an unsubscribe function.
       */
      onEdaFsEvent: (
        callback: (ev: { type: 'change' | 'rename'; path: string }) => void,
      ) => () => void;
    };
    api: unknown;
  }
}