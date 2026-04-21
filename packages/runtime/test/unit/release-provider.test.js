import { createRequire } from 'node:module';

import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);

const electronPath = require.resolve('electron');
require.cache[electronPath] = {
  id: electronPath,
  filename: electronPath,
  loaded: true,
  exports: {
    app: {
      getName: () => 'mock-app',
      getVersion: () => '0.0.0-mock',
      on: () => {},
      whenReady: async () => {},
      quit: () => {},
    },
    ipcMain: {
      handle: () => {},
      removeHandler: () => {},
    },
    BrowserWindow: class MockBrowserWindow {},
    contextBridge: { exposeInMainWorld: () => {} },
    ipcRenderer: {},
  },
  children: [],
  paths: [],
};

const electronUpdaterPath = require.resolve('electron-updater');
require.cache[electronUpdaterPath] = {
  id: electronUpdaterPath,
  filename: electronUpdaterPath,
  loaded: true,
  exports: {
    autoUpdater: {
      setFeedURL: () => {},
      on: () => {},
      once: () => {},
      removeListener: () => {},
      checkForUpdates: async () => null,
      downloadUpdate: async () => [],
      quitAndInstall: () => {},
    },
  },
  children: [],
  paths: [],
};

const {
  GenericHttpProvider,
  GithubReleaseProvider,
  ReleaseProviderError,
  resolveProvider,
} = require('../../dist/index.js');

describe('release providers', () => {
  test('GenericHttpProvider.publish rejects with UNSUPPORTED', async () => {
    const provider = new GenericHttpProvider({ baseUrl: 'x' });

    await expect(
      provider.publish({
        path: '/tmp/app.dmg',
        version: '1.2.3',
        platform: 'darwin',
        arch: 'arm64',
        sha512: 'sha',
        sizeBytes: 123,
      }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED' });
  });

  test('resolveProvider returns GithubReleaseProvider for github', () => {
    const provider = resolveProvider('github', { repository: { owner: 'o', name: 'r' } });

    expect(provider).toBeInstanceOf(GithubReleaseProvider);
  });

  test('resolveProvider rejects unknown provider ids with INVALID_CONFIG', () => {
    expect(() => resolveProvider('unknown', {})).toThrow(ReleaseProviderError);
    expect(() => resolveProvider('unknown', {})).toThrow(
      expect.objectContaining({ code: 'INVALID_CONFIG' }),
    );
  });
});
