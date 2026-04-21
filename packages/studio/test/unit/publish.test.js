import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { loadRisotronConfig, runPublish } from '../../dist/cli/publish.js';

const tempDirs = [];
let oldCwd;

beforeEach(() => {
  oldCwd = process.cwd();
});

afterEach(async () => {
  process.chdir(oldCwd);
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe('runPublish app-root validation', () => {
  test('rejects when cwd is not an App X root', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'risotron-publish-root-'));
    tempDirs.push(dir);
    process.chdir(dir);

    await assert.rejects(
      () => runPublish({ dryRun: true }),
      /must contain package\.json and risotron\.config\.ts/i,
    );
  });
});

describe('loadRisotronConfig', () => {
  test('evaluates a TypeScript default export with esbuild', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'risotron-publish-config-'));
    tempDirs.push(dir);

    const configPath = path.join(dir, 'risotron.config.ts');
    await fs.writeFile(
      configPath,
      `
        import type { RisotronConfig } from '@risotron/runtime';

        export default {
          releaseProvider: 'github',
          providerConfig: {
            repository: { owner: 'octo-user', name: 'demo-releases' },
          },
        } satisfies RisotronConfig;
      `,
      'utf8',
    );

    const config = await loadRisotronConfig(configPath);

    assert.equal(config.releaseProvider, 'github');
    assert.deepEqual(config.providerConfig.repository, {
      owner: 'octo-user',
      name: 'demo-releases',
    });
  });
});
