import { ipcMain } from 'electron';
import type { RisotronApplication } from './application.js';

/**
 * STUB for brief-3.
 *
 * Reserves the IPC surface expected by the renderer `updates` namespace:
 *   - `risotron:update.check`  → `{ hasUpdate: false }`
 *   - `risotron:update.apply`  → rejects with Error('not implemented yet')
 *
 * Brief-3 replaces this body with real `IReleaseProvider` + `electron-updater`
 * wiring. Brief-2 only reserves the channels so preload can be shipped.
 */
export function registerUpdaterIPC(app: RisotronApplication): void {
  // `app` will be used by brief-3 to compare installed vs. latest version;
  // the stub only needs to reserve the IPC channels.
  void app;

  ipcMain.handle('risotron:update.check', async () => {
    return { hasUpdate: false };
  });

  ipcMain.handle('risotron:update.apply', async () => {
    throw new Error('not implemented yet');
  });
}
