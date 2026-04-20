import { contextBridge, ipcRenderer } from 'electron';

export interface IRisotronAPI {
  /**
   * High-level auto-update namespace. Real wiring lands in brief-3; Phase 1 α
   * delegates to IPC stubs that return `{ hasUpdate: false }` / reject.
   */
  readonly updates: {
    check(): Promise<{ hasUpdate: boolean; latestVersion?: string; releaseNotes?: string }>;
    apply(): Promise<void>;
    onProgress(cb: (p: { percent: number; bytesPerSec: number }) => void): () => void;
  };

  // Low-level IPC escape hatch (see spec §3.3)
  invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
  send(channel: string, ...args: unknown[]): void;
  on(channel: string, cb: (...args: unknown[]) => void): () => void;
  once(channel: string, cb: (...args: unknown[]) => void): void;
}

function createRisotronAPI(): IRisotronAPI {
  return {
    updates: {
      check: () => ipcRenderer.invoke('risotron:update.check'),
      apply: () => ipcRenderer.invoke('risotron:update.apply'),
      onProgress: (cb) => {
        const subscription = (
          _event: Electron.IpcRendererEvent,
          p: { percent: number; bytesPerSec: number },
        ) => cb(p);
        ipcRenderer.on('risotron:update.progress', subscription);
        return () => {
          ipcRenderer.removeListener('risotron:update.progress', subscription);
        };
      },
    },

    invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> => {
      return ipcRenderer.invoke(channel, ...args);
    },

    send: (channel: string, ...args: unknown[]): void => {
      ipcRenderer.send(channel, ...args);
    },

    on: (channel: string, cb: (...args: unknown[]) => void): (() => void) => {
      const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => cb(...args);
      ipcRenderer.on(channel, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },

    once: (channel: string, cb: (...args: unknown[]) => void): void => {
      ipcRenderer.once(channel, (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
        cb(...args),
      );
    },
  };
}

/**
 * Call from the preload script to expose `window.risotron` to the renderer.
 */
export function exposeRisotronAPI(): void {
  contextBridge.exposeInMainWorld('risotron', createRisotronAPI());
}

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    risotron: IRisotronAPI;
  }
}
