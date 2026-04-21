/**
 * Smoke-test harness for runtime IPC and updater check wiring.
 *
 * Two modes:
 *   - Interactive (default): opens a window with manual buttons. Useful for
 *     humans. Run via `pnpm --filter @risotron/runtime smoke`.
 *   - Auto (`SMOKE_AUTO=1`): renderer fires all three checks on load and
 *     sends results back via IPC; main process logs results and exits with
 *     code 0 (pass) or 1 (fail). Used for CI / agent verification.
 *
 * Verifies:
 *   - AC-2.2: onReady fires after app.whenReady()
 *   - AC-2.4: window.risotron.invoke('ping') -> 'pong'
 *   - AC-3.6: window.risotron.updates.check() resolves to update state
 */
const { ipcMain, app: electronApp } = require('electron');
const path = require('node:path');
const { autoUpdater } = require('electron-updater');
const {
  createApplication,
  createBrowserWindow,
  configureApplicationUpdater,
  GithubReleaseProvider,
} = require('../../dist/index.js');

const AUTO = process.env.SMOKE_AUTO === '1';
const GITHUB_OWNER = process.env.SMOKE_GITHUB_OWNER;
const GITHUB_REPO = process.env.SMOKE_GITHUB_REPO;

const app = createApplication({
  name: 'Risotron Smoke',
  version: '0.0.0-smoke',
});

// AC-2.4: ping/pong handler
ipcMain.handle('ping', () => 'pong');

const provider =
  GITHUB_OWNER && GITHUB_REPO
    ? new GithubReleaseProvider({ repository: { owner: GITHUB_OWNER, name: GITHUB_REPO } })
    : {
        id: 'smoke',
        publish: async () => ({ releaseUrl: 'https://example.invalid/releases/0.0.1' }),
        getManifest: async () => ({
          version: '0.0.1',
          releaseDate: new Date('2026-04-20T00:00:00.000Z').toISOString(),
          releaseNotes: 'Smoke release',
          files: [],
        }),
        downloadUpdate: async (version) => ({ stagedPath: '/tmp/risotron-smoke.dmg', version }),
      };

if (GITHUB_OWNER && GITHUB_REPO) {
  autoUpdater.forceDevUpdateConfig = true;
}

configureApplicationUpdater(app, provider);

// AC-2.2 probe
let readyFired = false;
app.onReady(() => {
  readyFired = true;
  console.log('[smoke] AC-2.2 PASS onReady fired; isReady =', app.isReady);

  const preloadPath = path.join(__dirname, 'preload.js');
  const win = createBrowserWindow({
    width: 600,
    height: 480,
    show: !AUTO,
    webPreferences: {
      preload: preloadPath,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer.html'));

  if (AUTO) {
    // Renderer auto-runs via query string flag.
    win.webContents.once('did-finish-load', () => {
      win.webContents
        .executeJavaScript('window.__smokeRun()')
        .catch((err) => {
          console.error('[smoke] executeJavaScript failed:', err);
          process.exit(1);
        });
    });
  }
});

if (AUTO) {
  ipcMain.on('smoke:report', (_event, report) => {
    let pass = true;
    if (report.ping.ok) {
      console.log('[smoke] AC-2.4 PASS invoke("ping") ->', report.ping.value);
    } else {
      console.error('[smoke] AC-2.4 FAIL invoke("ping") ->', report.ping);
      pass = false;
    }
    if (report.check.ok) {
      console.log('[smoke] AC-3.6 PASS updates.check() ->', JSON.stringify(report.check.value));
    } else {
      console.error('[smoke] AC-3.6 FAIL updates.check() ->', report.check);
      pass = false;
    }
    if (!readyFired) {
      console.error('[smoke] AC-2.2 FAIL onReady never fired');
      pass = false;
    }
    console.log(pass ? '[smoke] ALL PASS' : '[smoke] FAILURES PRESENT');
    electronApp.exit(pass ? 0 : 1);
  });

  // Safety timeout — avoid hanging CI runs
  setTimeout(() => {
    console.error('[smoke] timeout waiting for smoke:report');
    electronApp.exit(2);
  }, 15_000);
}

app.onWindowAllClosed(() => {
  if (!AUTO && process.platform !== 'darwin') {
    app.quit();
  }
});

app.run();
