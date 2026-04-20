import { autoUpdater, type UpdateDownloadedEvent, type UpdateInfo } from 'electron-updater';

import {
  ReleaseProviderError,
  type IReleaseProvider,
  type ReleaseArtifact,
  type ReleaseManifest,
  type Semver,
  type StagedUpdate,
} from './types.js';

export interface GithubProviderConfig {
  repository: { owner: string; name: string };
  channel?: 'latest' | 'beta';
}

export class GithubReleaseProvider implements IReleaseProvider {
  readonly id = 'github';

  constructor(private readonly config: GithubProviderConfig) {
    this._validateConfig(config);
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: config.repository.owner,
      repo: config.repository.name,
    });
    if (config.channel) {
      autoUpdater.channel = config.channel;
    }
  }

  async publish(artifact: ReleaseArtifact): Promise<{ readonly releaseUrl: string }> {
    void artifact;
    // Runtime-side publishing is intentionally unsupported: releases are created
    // by electron-forge publisher-github through `risotron publish` at build time.
    throw new ReleaseProviderError('UNSUPPORTED', 'GitHub publishing is handled at build time');
  }

  async getManifest(): Promise<ReleaseManifest> {
    try {
      const result = await autoUpdater.checkForUpdates();
      if (!result) {
        throw new ReleaseProviderError('NOT_FOUND', 'No update manifest was returned');
      }
      return this._toManifest(result.updateInfo);
    } catch (err) {
      throw this._wrapError(err, 'Failed to fetch GitHub release manifest');
    }
  }

  async downloadUpdate(version: Semver): Promise<StagedUpdate> {
    try {
      const downloaded = new Promise<UpdateDownloadedEvent>((resolve, reject) => {
        const onDownloaded = (event: UpdateDownloadedEvent) => {
          autoUpdater.removeListener('error', onError);
          resolve(event);
        };
        const onError = (err: Error) => {
          autoUpdater.removeListener('update-downloaded', onDownloaded);
          reject(err);
        };

        autoUpdater.once('update-downloaded', onDownloaded);
        autoUpdater.once('error', onError);
      });

      const paths = await autoUpdater.downloadUpdate();
      const event = await downloaded;
      const stagedPath = event.downloadedFile || paths[0];
      if (!stagedPath) {
        throw new ReleaseProviderError('NOT_FOUND', 'Downloaded update path was not returned');
      }

      return { stagedPath, version };
    } catch (err) {
      throw this._wrapError(err, `Failed to download GitHub release ${version}`);
    }
  }

  private _validateConfig(config: GithubProviderConfig): void {
    if (!config?.repository?.owner || !config.repository.name) {
      throw new ReleaseProviderError(
        'INVALID_CONFIG',
        'GitHub release provider requires repository.owner and repository.name',
      );
    }
  }

  private _toManifest(info: UpdateInfo): ReleaseManifest {
    return {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: this._formatReleaseNotes(info.releaseNotes),
      files: info.files.map((file) => ({
        url: file.url,
        sha512: file.sha512,
        sizeBytes: file.size ?? 0,
      })),
    };
  }

  private _formatReleaseNotes(notes: UpdateInfo['releaseNotes']): string | undefined {
    if (!notes) {
      return undefined;
    }
    if (typeof notes === 'string') {
      return notes;
    }
    return notes
      .map((note) => note.note)
      .filter((note): note is string => Boolean(note))
      .join('\n\n');
  }

  private _wrapError(err: unknown, message: string): ReleaseProviderError {
    if (err instanceof ReleaseProviderError) {
      return err;
    }
    return new ReleaseProviderError(this._classifyError(err), message, err);
  }

  private _classifyError(err: unknown): ReleaseProviderError['code'] {
    const message = err instanceof Error ? err.message : String(err);
    if (/401|403|auth|token|unauthori[sz]ed/i.test(message)) {
      return 'AUTH_FAILED';
    }
    if (/404|not found|no published versions/i.test(message)) {
      return 'NOT_FOUND';
    }
    return 'NETWORK';
  }
}
