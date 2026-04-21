import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

interface GhRepoView {
  readonly url: string;
  readonly sshUrl: string;
}

/** Verify gh is installed and authenticated. */
export async function checkGhAvailable(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    await runGh(['auth', 'status']);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Create a private repo. Owner is deduced from gh auth if not given. Returns the HTTPS URL. */
export async function createPrivateRepo(
  owner: string,
  name: string,
  description?: string,
): Promise<{ url: string; sshUrl: string }> {
  const fullName = owner ? `${owner}/${name}` : name;
  const args = ['repo', 'create', fullName, '--private', '--confirm'];

  if (description) {
    args.push('--description', description);
  }

  await runGh(args);

  return getRepoUrls(fullName);
}

/** Lazy token fetch — ONLY used at publish time. Never persisted. */
export async function getGhToken(): Promise<string> {
  const { stdout } = await runGh(['auth', 'token']);

  return stdout.trim();
}

async function getRepoUrls(fullName: string): Promise<GhRepoView> {
  const { stdout } = await runGh([
    'repo',
    'view',
    fullName,
    '--json',
    'url,sshUrl',
  ]);

  return JSON.parse(stdout) as GhRepoView;
}

async function runGh(args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync('gh', args);
  } catch (err) {
    throw new Error(errorMessage(err));
  }
}

function errorMessage(err: unknown): string {
  if (isExecError(err)) {
    const stderr = err.stderr?.trim();
    const stdout = err.stdout?.trim();
    const details = stderr || stdout || err.message;
    const code = err.code ?? 'unknown';

    return `gh exited with code ${code}: ${details}`;
  }

  return err instanceof Error ? err.message : String(err);
}

function isExecError(
  err: unknown,
): err is Error & { code?: number | string; stdout?: string; stderr?: string } {
  return err instanceof Error && ('stdout' in err || 'stderr' in err);
}
