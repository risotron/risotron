import { execFile, spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { transformSync } from 'esbuild';
import {
  ReleaseProviderError,
  resolveProvider,
  type RisotronConfig,
} from '@risotron/runtime';

const execFileAsync = promisify(execFile);

export interface PublishOptions {
  readonly dryRun?: boolean;
}

interface PackageJson {
  readonly version?: string;
}

/**
 * App X must carry the ad-hoc codesign hook in `forge.config.ts`:
 * `postPackage` signs each packaged `.app` via `codesign --force --deep --sign -`.
 * This CLI intentionally does not run codesign itself, so direct Forge maker
 * invocations and `risotron publish` use the same hook.
 */
export async function runPublish(opts: PublishOptions = {}): Promise<void> {
  const appRoot = await resolveAppRoot(process.cwd());
  const pkg = await readPackageJson(appRoot);
  const version = requireVersion(pkg);
  const config = await loadRisotronConfig(join(appRoot, 'risotron.config.ts'));

  await assertGitClean(appRoot);
  const { checkGhAvailable, getGhToken } = await import('../lib/gh.js');
  const ghStatus = await checkGhAvailable();

  if (!ghStatus.ok) {
    throw new Error('Run `gh auth login` then retry');
  }

  await assertVersionNotPublished(config, version);

  await runInherited('npx', ['electron-forge', 'package'], appRoot);
  await runInherited('npx', ['electron-forge', 'make'], appRoot);

  const releaseUrl = deriveReleaseUrl(config);

  if (opts.dryRun) {
    console.log('would run: electron-forge publish');
    console.log(`Publish target: ${releaseUrl}`);
    return;
  }

  const token = await getGhToken();
  const output = await runPublishChild(appRoot, token);
  const printedUrl = parseReleaseUrl(output) ?? releaseUrl;

  console.log(`Published release: ${printedUrl}`);
}

async function resolveAppRoot(cwd: string): Promise<string> {
  const packageJsonPath = join(cwd, 'package.json');
  const configPath = join(cwd, 'risotron.config.ts');

  if (!(await exists(packageJsonPath)) || !(await exists(configPath))) {
    throw new Error('App X root must contain package.json and risotron.config.ts');
  }

  return cwd;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readPackageJson(appRoot: string): Promise<PackageJson> {
  const raw = await readFile(join(appRoot, 'package.json'), 'utf8');

  return JSON.parse(raw) as PackageJson;
}

function requireVersion(pkg: PackageJson): string {
  if (!pkg.version) {
    throw new Error('package.json must contain a version before publishing');
  }

  return pkg.version;
}

export async function loadRisotronConfig(configPath: string): Promise<RisotronConfig> {
  const source = await readFile(configPath, 'utf8');
  const compiled = transformSync(source, {
    format: 'cjs',
    loader: 'ts',
    platform: 'node',
    sourcemap: false,
    target: 'node20',
  });
  const module = { exports: {} as Record<string, unknown> };
  const require = createRequire(pathToFileURL(configPath));
  const evaluate = new Function('module', 'exports', 'require', compiled.code);

  evaluate(module, module.exports, require);

  const exported = module.exports.default ?? module.exports;

  if (!isRisotronConfig(exported)) {
    throw new Error('risotron.config.ts must default-export a valid RisotronConfig');
  }

  return exported;
}

function isRisotronConfig(value: unknown): value is RisotronConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'releaseProvider' in value &&
    'providerConfig' in value
  );
}

async function assertGitClean(appRoot: string): Promise<void> {
  try {
    await execFileAsync('git', ['diff', '--quiet'], { cwd: appRoot });
    await execFileAsync('git', ['diff', '--cached', '--quiet'], { cwd: appRoot });
  } catch {
    throw new Error('Working tree not clean. Commit or stash before publishing.');
  }
}

async function assertVersionNotPublished(
  config: RisotronConfig,
  version: string,
): Promise<void> {
  if (config.releaseProvider === 'github') {
    await assertGithubVersionNotPublished(config, version);
    return;
  }

  const provider = resolveProvider(config.releaseProvider, config.providerConfig);

  try {
    const manifest = await provider.getManifest();

    if (manifest.version === version) {
      throw new Error(`Version ${version} already published.`);
    }
  } catch (err) {
    if (err instanceof ReleaseProviderError && err.code === 'NOT_FOUND') {
      return;
    }

    throw err;
  }
}

async function assertGithubVersionNotPublished(
  config: Extract<RisotronConfig, { releaseProvider: 'github' }>,
  version: string,
): Promise<void> {
  const { owner, name } = config.providerConfig.repository;

  try {
    const { stdout } = await execFileAsync('gh', [
      'release',
      'view',
      `v${version}`,
      '--repo',
      `${owner}/${name}`,
      '--json',
      'tagName,name',
    ]);
    const release = JSON.parse(stdout) as { tagName?: string; name?: string };
    if (matchesPackageVersion(release, version)) {
      throw new Error(`Version ${version} already published.`);
    }
  } catch (err) {
    if (isAlreadyPublishedError(err)) {
      throw err;
    }

    if (isGhNotFound(err)) {
      return;
    }

    throw err;
  }
}

function matchesPackageVersion(
  release: { tagName?: string; name?: string },
  version: string,
): boolean {
  return [release.tagName, release.name]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/^v/, ''))
    .includes(version);
}

function isAlreadyPublishedError(err: unknown): boolean {
  return err instanceof Error && /^Version .+ already published\.$/.test(err.message);
}

function isGhNotFound(err: unknown): boolean {
  const message = errorOutput(err);

  return /not found|could not resolve|none? found|HTTP 404|release not found/i.test(message);
}

function errorOutput(err: unknown): string {
  if (isExecError(err)) {
    return [err.stderr, err.stdout, err.message].filter(Boolean).join('\n');
  }

  return err instanceof Error ? err.message : String(err);
}

function isExecError(
  err: unknown,
): err is Error & { stdout?: string; stderr?: string } {
  return err instanceof Error && ('stdout' in err || 'stderr' in err);
}

async function runInherited(
  command: string,
  args: string[],
  cwd: string,
): Promise<void> {
  await runChild(command, args, cwd, { stdio: 'inherit' });
}

async function runPublishChild(appRoot: string, token: string): Promise<string> {
  let output = '';

  await runChild('npx', ['electron-forge', 'publish'], appRoot, {
    env: { ...process.env, GH_TOKEN: token },
    onStdout: (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    },
    onStderr: (chunk) => {
      output += chunk;
      process.stderr.write(chunk);
    },
  });

  return output;
}

function runChild(
  command: string,
  args: string[],
  cwd: string,
  options: {
    readonly env?: NodeJS.ProcessEnv;
    readonly stdio?: 'inherit';
    readonly onStdout?: (chunk: string) => void;
    readonly onStderr?: (chunk: string) => void;
  } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: options.env ?? process.env,
      stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (chunk: Buffer) => {
      options.onStdout?.(chunk.toString());
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      options.onStderr?.(chunk.toString());
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function parseReleaseUrl(output: string): string | undefined {
  return output.match(/https:\/\/github\.com\/[^\s]+\/releases\/[^\s]+/)?.[0];
}

function deriveReleaseUrl(config: RisotronConfig): string {
  if (config.releaseProvider === 'github') {
    const { owner, name } = config.providerConfig.repository;

    return `https://github.com/${owner}/${name}/releases`;
  }

  return `${config.releaseProvider} release target`;
}
