import { GenericHttpProvider, type GenericHttpProviderConfig } from './generic-http.js';
import { GithubReleaseProvider, type GithubProviderConfig } from './github.js';
import {
  ReleaseProviderError,
  type IReleaseProvider,
  type ReleaseProviderFactory,
} from './types.js';

const registry = new Map<string, ReleaseProviderFactory>([
  ['github', (cfg) => new GithubReleaseProvider(cfg as GithubProviderConfig)],
  ['generic-http', (cfg) => new GenericHttpProvider(cfg as GenericHttpProviderConfig)],
]);

export function resolveProvider(id: string, config: unknown): IReleaseProvider {
  const factory = registry.get(id);
  if (!factory) {
    throw new ReleaseProviderError('INVALID_CONFIG', `Unknown releaseProvider: ${id}`);
  }
  return factory(config);
}
