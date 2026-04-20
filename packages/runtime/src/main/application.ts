import { app as electronApp } from 'electron';

export interface RisotronApplicationOptions {
  name?: string;
  version?: string;
}

export type EventCallback = () => void;

type AppEvent = 'ready' | 'before-quit' | 'window-all-closed' | 'activate';

/**
 * Lean application wrapper around Electron's `app` module.
 *
 * Phase 1 α: name/version/isReady getters, EventEmitter-style subscribe
 * methods for `ready` / `before-quit` / `window-all-closed` / `activate`
 * (each returns an unsubscribe function), plus `run()` / `quit()`.
 * See spec §2.2 for what is intentionally deferred to v0.2.
 */
export class RisotronApplication {
  private readonly _name: string;
  private readonly _version: string;
  private _isReady = false;
  private readonly _listeners: Record<AppEvent, Set<EventCallback>> = {
    ready: new Set(),
    'before-quit': new Set(),
    'window-all-closed': new Set(),
    activate: new Set(),
  };

  constructor(options: RisotronApplicationOptions = {}) {
    this._name = options.name ?? electronApp.getName();
    this._version = options.version ?? electronApp.getVersion();

    electronApp.on('before-quit', () => this._emit('before-quit'));
    electronApp.on('window-all-closed', () => this._emit('window-all-closed'));
    electronApp.on('activate', () => this._emit('activate'));
  }

  get name(): string {
    return this._name;
  }

  get version(): string {
    return this._version;
  }

  get isReady(): boolean {
    return this._isReady;
  }

  onReady(cb: EventCallback): () => void {
    return this._subscribe('ready', cb);
  }

  onBeforeQuit(cb: EventCallback): () => void {
    return this._subscribe('before-quit', cb);
  }

  onWindowAllClosed(cb: EventCallback): () => void {
    return this._subscribe('window-all-closed', cb);
  }

  onActivate(cb: EventCallback): () => void {
    return this._subscribe('activate', cb);
  }

  async run(): Promise<void> {
    await electronApp.whenReady();
    this._isReady = true;
    this._emit('ready');
  }

  quit(): void {
    electronApp.quit();
  }

  private _subscribe(event: AppEvent, cb: EventCallback): () => void {
    this._listeners[event].add(cb);
    return () => {
      this._listeners[event].delete(cb);
    };
  }

  private _emit(event: AppEvent): void {
    for (const cb of this._listeners[event]) {
      try {
        cb();
      } catch (err) {
        // Swallow listener errors so one bad listener doesn't abort the rest.
        // eslint-disable-next-line no-console
        console.error(`[risotron] listener for "${event}" threw:`, err);
      }
    }
  }
}

export function createApplication(options?: RisotronApplicationOptions): RisotronApplication {
  return new RisotronApplication(options);
}
