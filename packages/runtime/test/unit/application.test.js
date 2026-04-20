/**
 * Unit tests for RisotronApplication (brief-2).
 *
 * Covers:
 *   - AC-2.1: createApplication returns the expected public surface.
 *   - AC-2.3: each lifecycle subscribe method returns an unsubscribe function.
 *
 * Uses Node's built-in test runner with a require-cache mock for `electron`
 * so the main-process code can execute outside an actual Electron process.
 */
'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

// --- mock `electron` before loading the runtime --------------------------

const electronMock = {
  app: {
    getName: () => 'mock-app',
    getVersion: () => '0.0.0-mock',
    on: () => {},
    whenReady: async () => {},
    quit: () => {},
  },
  ipcMain: {
    handle: () => {},
  },
  BrowserWindow: class MockBrowserWindow {
    constructor(opts) {
      this.opts = opts;
    }
  },
  contextBridge: { exposeInMainWorld: () => {} },
  ipcRenderer: {},
};

const electronPath = require.resolve('electron');
require.cache[electronPath] = {
  id: electronPath,
  filename: electronPath,
  loaded: true,
  exports: electronMock,
  children: [],
  paths: [],
};

// Now safe to require the compiled runtime.
const { createApplication, RisotronApplication } = require('../../dist/index.js');

// --- tests ---------------------------------------------------------------

describe('AC-2.1 createApplication public surface', () => {
  test('returns an object with onReady / onBeforeQuit / onWindowAllClosed / onActivate / run / quit / name / version / isReady', () => {
    const app = createApplication({ name: 'X', version: '1.2.3' });
    assert.ok(app instanceof RisotronApplication);
    assert.equal(typeof app.onReady, 'function');
    assert.equal(typeof app.onBeforeQuit, 'function');
    assert.equal(typeof app.onWindowAllClosed, 'function');
    assert.equal(typeof app.onActivate, 'function');
    assert.equal(typeof app.run, 'function');
    assert.equal(typeof app.quit, 'function');
    assert.equal(app.name, 'X');
    assert.equal(app.version, '1.2.3');
    assert.equal(app.isReady, false);
  });

  test('falls back to electronApp.getName()/getVersion() when opts omitted', () => {
    const app = createApplication();
    assert.equal(app.name, 'mock-app');
    assert.equal(app.version, '0.0.0-mock');
  });
});

describe('AC-2.3 unsubscribe semantics', () => {
  for (const method of ['onReady', 'onBeforeQuit', 'onWindowAllClosed', 'onActivate']) {
    test(`${method}(cb) returns a function; calling it removes the listener`, () => {
      const app = createApplication({ name: 'X', version: '0.0.0' });
      let count = 0;
      const cb = () => {
        count += 1;
      };
      const unsub = app[method](cb);
      assert.equal(typeof unsub, 'function');

      // Map subscribe method -> internal event name
      const eventName = {
        onReady: 'ready',
        onBeforeQuit: 'before-quit',
        onWindowAllClosed: 'window-all-closed',
        onActivate: 'activate',
      }[method];

      // Emit once — listener fires
      app['_emit'](eventName);
      assert.equal(count, 1);

      // Unsubscribe — listener must NOT fire on subsequent emit
      unsub();
      app['_emit'](eventName);
      assert.equal(count, 1, `${method} listener still firing after unsub`);
    });
  }
});
