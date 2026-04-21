import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const RUNTIME_VERSION = '0.1.0';
const RUNTIME_TARBALL = `risotron-runtime-${RUNTIME_VERSION}.tgz`;
const RUNTIME_TARBALL_REF = `file:./vendor/${RUNTIME_TARBALL}`;

export interface ScaffoldInput {
  readonly targetDir: string;
  readonly appName: string;
  readonly appSlug: string;
  readonly version: string;
  readonly author: string;
  readonly releaseProvider: 'github' | 'generic-http';
  readonly ghOwner?: string;
}

export interface ScaffoldResult {
  readonly targetDir: string;
  readonly filesCreated: string[];
}

/**
 * Scaffold an App X instance from the default-app template.
 *
 * Sequence:
 *   1. Validate target directory (absolute; must not exist or be empty).
 *   2. Recursively copy the template tree.
 *   3. Replace `{{var}}` tokens in every `.tmpl` file, strip the suffix.
 *   4. `pnpm pack` the runtime, move tarball under `<target>/vendor/`.
 *   5. Rewrite scaffolded package.json's `@risotron/runtime` dep to the tarball.
 *   6. Return the list of files created (relative to targetDir).
 */
export async function scaffoldApp(
  input: ScaffoldInput,
): Promise<ScaffoldResult> {
  const { targetDir } = input;

  if (!isAbsolute(targetDir)) {
    throw new Error(`targetDir must be an absolute path: ${targetDir}`);
  }

  await ensureEmptyTarget(targetDir);
  await mkdir(targetDir, { recursive: true });

  const templateDir = resolveTemplateDir();
  await cp(templateDir, targetDir, { recursive: true });

  const tokens = buildTokenMap(input);
  await materializeTemplates(targetDir, tokens);

  const runtimeDir = await resolveRuntimePackageDir();
  await packRuntimeInto(runtimeDir, targetDir);

  await rewritePackageJsonRuntimeRef(targetDir);

  const filesCreated = await listFilesRelative(targetDir);

  return { targetDir, filesCreated };
}

function buildTokenMap(input: ScaffoldInput): Record<string, string> {
  return {
    appName: input.appName,
    appSlug: input.appSlug,
    version: input.version,
    author: input.author,
    runtimeVersion: RUNTIME_TARBALL_REF,
    releaseProvider: input.releaseProvider,
    ghOwner: input.ghOwner ?? '',
  };
}

export function replaceTokens(
  source: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    source,
  );
}

async function ensureEmptyTarget(targetDir: string): Promise<void> {
  try {
    const stats = await stat(targetDir);

    if (!stats.isDirectory()) {
      throw new Error(`targetDir exists and is not a directory: ${targetDir}`);
    }

    const entries = await readdir(targetDir);

    if (entries.length > 0) {
      throw new Error(`targetDir is not empty: ${targetDir}`);
    }
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === 'ENOENT') {
      return;
    }

    throw err;
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

function resolveTemplateDir(): string {
  return fileURLToPath(
    new URL('../../templates/default-app/', import.meta.url),
  );
}

async function materializeTemplates(
  targetDir: string,
  tokens: Record<string, string>,
): Promise<void> {
  const templates = await collectTmplFiles(targetDir);

  for (const tmplPath of templates) {
    const source = await readFile(tmplPath, 'utf8');
    const rendered = replaceTokens(source, tokens);
    const outPath = tmplPath.replace(/\.tmpl$/, '');

    await writeFile(outPath, rendered, 'utf8');
    await rm(tmplPath);
  }
}

async function collectTmplFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...(await collectTmplFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith('.tmpl')) {
      out.push(full);
    }
  }

  return out;
}

async function packRuntimeInto(
  runtimeDir: string,
  targetDir: string,
): Promise<void> {
  const vendorDir = join(targetDir, 'vendor');
  await mkdir(vendorDir, { recursive: true });

  const { stdout } = await execFileAsync(
    'pnpm',
    ['pack', '--pack-destination', vendorDir],
    {
      cwd: runtimeDir,
    },
  );

  const produced = stdout.trim().split(/\s+/).pop() ?? '';
  const destination = join(vendorDir, RUNTIME_TARBALL);

  if (produced && produced !== destination) {
    // `pnpm pack` writes to pack-destination; if it reports a different path
    // (older pnpm), rename it into place.
    try {
      await rename(produced, destination);
    } catch {
      // Ignore — tarball may already be at destination.
    }
  }

  const packed = await stat(destination).catch(() => null);

  if (!packed) {
    throw new Error(`runtime tarball not produced at ${destination}`);
  }
}

async function rewritePackageJsonRuntimeRef(targetDir: string): Promise<void> {
  const pkgPath = join(targetDir, 'package.json');
  const raw = await readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(raw) as {
    dependencies?: Record<string, string>;
  };

  pkg.dependencies ??= {};
  pkg.dependencies['@risotron/runtime'] = RUNTIME_TARBALL_REF;

  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

async function resolveRuntimePackageDir(): Promise<string> {
  const require = createRequire(import.meta.url);
  const mainEntry = require.resolve('@risotron/runtime');
  let dir = dirname(mainEntry);
  let parent = dirname(dir);

  while (parent !== dir) {
    const pkgPath = join(dir, 'package.json');

    try {
      const raw = await readFile(pkgPath, 'utf8');
      const pkg = JSON.parse(raw) as { name?: string };

      if (pkg.name === '@risotron/runtime') {
        return dir;
      }
    } catch {
      // fall through — keep walking up
    }

    dir = parent;
    parent = dirname(dir);
  }

  throw new Error('could not locate @risotron/runtime package root');
}

async function listFilesRelative(root: string): Promise<string[]> {
  const out: string[] = [];
  await walk(root, root, out);

  return out.sort();
}

async function walk(root: string, dir: string, acc: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      await walk(root, full, acc);
    } else if (entry.isFile()) {
      acc.push(relative(root, full));
    }
  }
}
