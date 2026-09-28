import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge } from 'electron';
import { exposeElectronTRPC } from 'electron-trpc/main';

process.once('loaded', () => {
  exposeElectronTRPC();
});

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('bb', {
      openEda: () => electronAPI.ipcRenderer.invoke('bb:openEda'),
    });
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-expect-error define on global
  window.electron = electronAPI;
  // @ts-expect-error define on global
  window.bb = { openEda: () => electronAPI.ipcRenderer.invoke('bb:openEda') };
}
