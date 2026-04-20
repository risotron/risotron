import {
  ReleaseProviderError,
  type IReleaseProvider,
  type ReleaseArtifact,
  type ReleaseManifest,
  type StagedUpdate,
} from './types.js';

export interface GenericHttpProviderConfig {
  baseUrl: string;
}

export class GenericHttpProvider implements IReleaseProvider {
  readonly id = 'generic-http';

  constructor(private readonly _config: GenericHttpProviderConfig) {}

  publish(artifact: ReleaseArtifact): Promise<{ readonly releaseUrl: string }> {
    void artifact;
    return this._unsupported();
  }

  getManifest(): Promise<ReleaseManifest> {
    return this._unsupported();
  }

  downloadUpdate(): Promise<StagedUpdate> {
    return this._unsupported();
  }

  private _unsupported<T>(): Promise<T> {
    return Promise.reject(
      new ReleaseProviderError('UNSUPPORTED', 'Generic HTTP provider is coming in v0.2'),
    );
  }
}
