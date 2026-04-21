import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { checkGhAvailable } from '../../dist/lib/gh.js';
import { updateRisotronConfig } from '../../dist/server/routes/release-server.js';

const tempDirs = [];

after(async () => {
  await Promise.all(
    tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe('checkGhAvailable', () => {
  test('returns ok false when gh is not on PATH', async () => {
    const oldPath = process.env.PATH;
    process.env.PATH = '';

    try {
      const result = await checkGhAvailable();

      assert.equal(result.ok, false);
      assert.match(result.error, /gh|ENOENT|spawn/i);
    } finally {
      process.env.PATH = oldPath;
    }
  });
});

describe('updateRisotronConfig', () => {
  test('rewrites risotron.config.ts with the selected GitHub repository', async () => {
    const appXDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'risotron-release-server-'),
    );
    tempDirs.push(appXDir);

    await fs.writeFile(
      path.join(appXDir, 'risotron.config.ts'),
      'export default {};\n',
      'utf8',
    );

    const configPath = await updateRisotronConfig(appXDir, {
      releaseProvider: 'github',
      providerConfig: {
        repository: {
          owner: 'octo-user',
          name: 'demo-app-releases',
        },
      },
    });

    const config = await fs.readFile(configPath, 'utf8');

    assert.equal(configPath, path.join(appXDir, 'risotron.config.ts'));
    assert.match(config, /releaseProvider: 'github'/);
    assert.match(config, /owner: 'octo-user'/);
    assert.match(config, /name: 'demo-app-releases'/);
  });

  test('rejects a non-existent appXDir', async () => {
    await assert.rejects(
      () =>
        updateRisotronConfig('/tmp/risotron-missing-appx', {
          releaseProvider: 'github',
          providerConfig: {
            repository: { owner: 'octo-user', name: 'demo-app-releases' },
          },
        }),
      /ENOENT|no such file/i,
    );
  });
});
