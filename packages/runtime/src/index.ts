/**
 * @risotron/runtime — public main-process API surface (Phase 1 α).
 *
 * Kept intentionally small. See brief-2 / spec §2.2 for what is deliberately
 * omitted from v0.1.
 */

export { RisotronApplication, createApplication } from './main/application.js';
export type { RisotronApplicationOptions, EventCallback } from './main/application.js';

export { BrowserWindow, createBrowserWindow } from './main/window.js';

export { configureApplicationUpdater, registerUpdaterIPC } from './main/updater.js';

export type { IRisotronAPI } from './preload/api.js';

export { GenericHttpProvider } from './release/generic-http.js';
export { GithubReleaseProvider } from './release/github.js';
export { resolveProvider } from './release/registry.js';
export { ReleaseProviderError } from './release/types.js';
export type {
  Arch,
  IReleaseProvider,
  Platform,
  ReleaseArtifact,
  ReleaseManifest,
  ReleaseProviderErrorCode,
  Semver,
  StagedUpdate,
} from './release/types.js';
export type { GenericHttpProviderConfig } from './release/generic-http.js';
export type { GithubProviderConfig } from './release/github.js';

import type { GenericHttpProviderConfig } from './release/generic-http.js';
import type { GithubProviderConfig } from './release/github.js';

export type RisotronConfig =
  | { releaseProvider: 'github'; providerConfig: GithubProviderConfig }
  | { releaseProvider: 'generic-http'; providerConfig: GenericHttpProviderConfig };
