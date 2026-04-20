/** Semantic version string — enforced by producer, not parsed at type level. */
export type Semver = string;

/** Platform identifier as reported by electron-forge maker output. */
export type Platform = 'darwin';

/** Architecture. */
export type Arch = 'x64' | 'arm64';

/** What goes up. Produced by publish pipeline; consumed by IReleaseProvider.publish. */
export interface ReleaseArtifact {
  /** Absolute path to built artifact (.dmg | .zip). */
  readonly path: string;
  /** Semver — MUST match App X package.json at publish time. */
  readonly version: Semver;
  readonly platform: Platform;
  readonly arch: Arch;
  /** Base64-encoded SHA-512 of the artifact file. */
  readonly sha512: string;
  readonly sizeBytes: number;
  /** Defaults to 'latest'. */
  readonly channel?: 'latest' | 'beta';
}

/** What comes down. Produced by IReleaseProvider.getManifest. */
export interface ReleaseManifest {
  readonly version: Semver;
  /** ISO 8601. */
  readonly releaseDate: string;
  readonly releaseNotes?: string;
  readonly files: ReadonlyArray<{
    readonly url: string;
    readonly sha512: string;
    readonly sizeBytes: number;
  }>;
}

/** Result of a successful downloadUpdate(). */
export interface StagedUpdate {
  /** Absolute path to staged installer on local disk. */
  readonly stagedPath: string;
  readonly version: Semver;
}

/** Typed error shape. Providers MUST reject with this, not raw Error. */
export type ReleaseProviderErrorCode =
  | 'AUTH_FAILED'
  | 'NETWORK'
  | 'NO_UPDATE'
  | 'NOT_FOUND'
  | 'UNSUPPORTED'
  | 'INVALID_CONFIG';

export class ReleaseProviderError extends Error {
  constructor(
    public readonly code: ReleaseProviderErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ReleaseProviderError';
  }
}

/** The contract. */
export interface IReleaseProvider {
  /** Stable identifier — matches risotron.config.ts `releaseProvider` field. */
  readonly id: string;

  /**
   * Upload artifact and publish it to the backing release server.
   * Idempotent for the same (version, platform, arch) triple: re-publish SHOULD overwrite.
   * @returns URL of the published release (for logging / Studio UI).
   * @throws ReleaseProviderError — AUTH_FAILED | NETWORK | INVALID_CONFIG
   */
  publish(artifact: ReleaseArtifact): Promise<{ readonly releaseUrl: string }>;

  /**
   * Fetch the latest release manifest from the server.
   * @throws ReleaseProviderError — NETWORK | NOT_FOUND | AUTH_FAILED
   */
  getManifest(): Promise<ReleaseManifest>;

  /**
   * Download the update binary for the given version and stage it on local disk.
   * Delegates to electron-updater under the hood.
   * @throws ReleaseProviderError — NETWORK | NOT_FOUND
   */
  downloadUpdate(version: Semver): Promise<StagedUpdate>;
}

/** Factory signature — consumed by createApplication() via options. */
export type ReleaseProviderFactory = (config: unknown) => IReleaseProvider;
