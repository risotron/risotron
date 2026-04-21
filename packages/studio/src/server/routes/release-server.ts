import { Hono } from 'hono';
import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { z } from 'zod';
import { checkGhAvailable, createPrivateRepo } from '../../lib/gh.js';

const releaseServerInputSchema = z.object({
  appXDir: z.string().min(1),
  appSlug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'appSlug must be kebab-case')
    .optional(),
  ghOwner: z.string().min(1),
  repoName: z
    .string()
    .min(1)
    .regex(/^[A-Za-z0-9._-]+$/, 'repoName contains invalid characters'),
});

export const releaseServerRoute = new Hono();

releaseServerRoute.post('/api/release-server', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: 'CREATE_RELEASE_REPO_FAILED', message: 'invalid JSON body' },
      400,
    );
  }

  const parsed = releaseServerInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: 'CREATE_RELEASE_REPO_FAILED',
        message: parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      },
      400,
    );
  }

  const check = await checkGhAvailable();

  if (!check.ok) {
    return c.json({ error: 'GH_UNAVAILABLE', message: check.error }, 400);
  }

  try {
    await assertRisotronConfigReadable(parsed.data.appXDir);

    const { url } = await createPrivateRepo(
      parsed.data.ghOwner,
      parsed.data.repoName,
      `Release artifacts for ${parsed.data.appSlug ?? parsed.data.repoName}`,
    );

    const configPath = await updateRisotronConfig(parsed.data.appXDir, {
      releaseProvider: 'github',
      providerConfig: {
        repository: {
          owner: parsed.data.ghOwner,
          name: parsed.data.repoName,
        },
      },
    });

    return c.json({ url, configPath });
  } catch (e) {
    return c.json(
      { error: 'CREATE_RELEASE_REPO_FAILED', message: String(e) },
      400,
    );
  }
});

interface GithubReleaseConfig {
  readonly releaseProvider: 'github';
  readonly providerConfig: {
    readonly repository: {
      readonly owner: string;
      readonly name: string;
    };
  };
}

export async function updateRisotronConfig(
  appXDir: string,
  config: GithubReleaseConfig,
): Promise<string> {
  const configPath = await assertRisotronConfigReadable(appXDir);
  const rendered = `import type { RisotronConfig } from '@risotron/runtime';

export default {
  releaseProvider: '${config.releaseProvider}',
  providerConfig: {
    repository: { owner: '${escapeSingleQuoted(config.providerConfig.repository.owner)}', name: '${escapeSingleQuoted(config.providerConfig.repository.name)}' },
  },
} satisfies RisotronConfig;
`;

  await writeFile(configPath, rendered, 'utf8');

  return configPath;
}

async function assertRisotronConfigReadable(appXDir: string): Promise<string> {
  if (!isAbsolute(appXDir)) {
    throw new Error(`appXDir must be an absolute path: ${appXDir}`);
  }

  const configPath = join(appXDir, 'risotron.config.ts');
  await readFile(configPath, 'utf8');

  return configPath;
}

function escapeSingleQuoted(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}
