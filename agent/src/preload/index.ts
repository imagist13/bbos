import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge, type IpcRendererEvent } from 'electron';
import { exposeElectronTRPC } from 'electron-trpc/main';

process.once('loaded', () => {
  exposeElectronTRPC();
});

type FsEvent = { type: 'change' | 'rename'; path: string };

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('bb', {
      openEda: () => electronAPI.ipcRenderer.invoke('bb:openEda'),
      /**
       * Subscribe to file-system events emitted by the EDA workbench watcher.
       * Returns an unsubscribe function.
       */
      onEdaFsEvent: (callback: (ev: FsEvent) => void): (() => void) => {
        const handler = (_event: IpcRendererEvent, payload: FsEvent): void =>
          callback(payload);
        electronAPI.ipcRenderer.on('eda:fs-event', handler);
        return () => electronAPI.ipcRenderer.removeListener('eda:fs-event', handler);
      },
    });
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-expect-error define on global
  window.electron = electronAPI;
  // @ts-expect-error define on global
  window.bb = {
    openEda: () => electronAPI.ipcRenderer.invoke('bb:openEda'),
    onEdaFsEvent: (callback: (ev: FsEvent) => void): (() => void) => {
      const handler = (_event: IpcRendererEvent, payload: FsEvent): void =>
        callback(payload);
      electronAPI.ipcRenderer.on('eda:fs-event', handler);
      return () => electronAPI.ipcRenderer.removeListener('eda:fs-event', handler);
    },
  };
}