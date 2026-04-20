import { BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import semver from 'semver';

import type { RisotronApplication } from './application.js';
import type { IReleaseProvider } from '../release/types.js';

const CHECK_CHANNEL = 'risotron:update.check';
const APPLY_CHANNEL = 'risotron:update.apply';
const PROGRESS_CHANNEL = 'risotron:update.progress';

type MacSignatureBypassUpdater = typeof autoUpdater & {
  verifyUpdateCodeSignature?: () => Promise<null>;
};

export function registerUpdaterIPC(app: RisotronApplication, provider: IReleaseProvider): void {
  configureAutoUpdater();

  ipcMain.removeHandler(CHECK_CHANNEL);
  ipcMain.handle(CHECK_CHANNEL, async () => {
    const manifest = await provider.getManifest();
    const hasUpdate = semver.gt(manifest.version, app.version);

    return {
      hasUpdate,
      latestVersion: manifest.version,
      releaseNotes: manifest.releaseNotes,
    };
  });

  ipcMain.removeHandler(APPLY_CHANNEL);
  ipcMain.handle(APPLY_CHANNEL, async () => {
    const manifest = await provider.getManifest();
    await provider.downloadUpdate(manifest.version);
    autoUpdater.quitAndInstall();
  });

  autoUpdater.removeListener('download-progress', forwardDownloadProgress);
  autoUpdater.on('download-progress', forwardDownloadProgress);
}

export function configureApplicationUpdater(
  app: RisotronApplication,
  provider: IReleaseProvider,
): void {
  registerUpdaterIPC(app, provider);
}

function configureAutoUpdater(): void {
  if (process.platform === 'darwin') {
    (autoUpdater as MacSignatureBypassUpdater).verifyUpdateCodeSignature = async () => null;
  }

  autoUpdater.disableDifferentialDownload = true;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
}

function forwardDownloadProgress(progress: { percent: number; bytesPerSecond: number }): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(PROGRESS_CHANNEL, {
      percent: progress.percent,
      bytesPerSec: progress.bytesPerSecond,
    });
  }
}
