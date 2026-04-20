import { BrowserWindow } from 'electron';

export { BrowserWindow } from 'electron';

/**
 * Thin wrapper around `new BrowserWindow(opts)` that applies sane Phase-1
 * `webPreferences` defaults: `contextIsolation: true`, `nodeIntegration: false`,
 * `sandbox: false`.
 *
 * `sandbox` is left **off** so the app's own preload can `require()` local
 * CommonJS modules (e.g. `@risotron/runtime/preload`). With `contextIsolation`
 * still enabled, the renderer remains isolated from Node; sandbox is a separate
 * hardening layer aimed at untrusted web content, which Phase 1 α does not load.
 *
 * The preload path is NOT injected here — callers pass it explicitly via
 * `opts.webPreferences.preload` because only the caller knows the correct
 * absolute path on disk.
 */
export function createBrowserWindow(
  opts: Electron.BrowserWindowConstructorOptions = {},
): Electron.BrowserWindow {
  const { webPreferences, ...rest } = opts;
  return new BrowserWindow({
    ...rest,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      ...webPreferences,
    },
  });
}
