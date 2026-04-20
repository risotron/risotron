/**
 * @risotron/runtime — public main-process API surface (Phase 1 α).
 *
 * Kept intentionally small. See brief-2 / spec §2.2 for what is deliberately
 * omitted from v0.1. Release-provider types expand in brief-3.
 */

export { RisotronApplication, createApplication } from './main/application.js';
export type { RisotronApplicationOptions, EventCallback } from './main/application.js';

export { BrowserWindow, createBrowserWindow } from './main/window.js';

export { registerUpdaterIPC } from './main/updater.js';

export type { IRisotronAPI } from './preload/api.js';

// -----------------------------------------------------------------------------
// RisotronConfig — shape defined in spec §3.6
//
// Release-provider implementations (GithubReleaseProvider, GenericHttpProvider)
// and the `IReleaseProvider` contract land in brief-3. Brief-2 only ships the
// config TYPES so App X authors can type `risotron.config.ts` today.
// -----------------------------------------------------------------------------

export interface GithubProviderConfig {
  repository: { owner: string; name: string };
  /** Channel to publish to. Default 'latest'. */
  channel?: 'latest' | 'beta';
}

export interface GenericHttpProviderConfig {
  /** Stubbed in Phase 1 α. Any value accepted; runtime throws UNSUPPORTED. */
  baseUrl: string;
}

export type RisotronConfig =
  | { releaseProvider: 'github'; providerConfig: GithubProviderConfig }
  | { releaseProvider: 'generic-http'; providerConfig: GenericHttpProviderConfig };
