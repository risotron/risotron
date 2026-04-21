/**
 * Unit + integration tests for the studio scaffold library (brief-5).
 *
 * Covers:
 *   - AC-5.1: scaffoldApp on empty target creates package.json, risotron.config.ts,
 *             README.md, .gitignore, and vendor/risotron-runtime-0.1.0.tgz.
 *   - AC-5.2: package.json has name/productName/@risotron/runtime pointing at tarball.
 *   - AC-5.3: risotron.config.ts carries the supplied ghOwner.
 *   - AC-5.8: no .tmpl files remain in the scaffolded dir.
 *   - Additional: replaceTokens is a pure `{{var}}` substitutor.
 *   - Additional: non-absolute targetDir and non-empty targetDir are rejected.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { replaceTokens, scaffoldApp } from '../../dist/lib/scaffold.js';

describe('replaceTokens', () => {
  test('substitutes every {{var}} occurrence', () => {
    const out = replaceTokens('hello {{name}}, build {{name}} {{version}}', {
      name: 'world',
      version: '1.2.3',
    });

    assert.equal(out, 'hello world, build world 1.2.3');
  });

  test('leaves unknown tokens untouched', () => {
    assert.equal(replaceTokens('{{unknown}}', { known: 'x' }), '{{unknown}}');
  });
});

describe('scaffoldApp rejects bad targetDir', () => {
  test('rejects a relative targetDir', async () => {
    await assert.rejects(
      () =>
        scaffoldApp({
          targetDir: 'relative/path',
          appName: 'X',
          appSlug: 'x',
          version: '0.1.0',
          author: 'dev',
          releaseProvider: 'github',
          ghOwner: 'acme',
        }),
      /absolute path/i,
    );
  });

  test('rejects a non-empty existing targetDir', async () => {
    const dir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'risotron-scaffold-nonempty-'),
    );
    await fs.writeFile(path.join(dir, 'occupant.txt'), 'hi', 'utf8');

    try {
      await assert.rejects(
        () =>
          scaffoldApp({
            targetDir: dir,
            appName: 'X',
            appSlug: 'x',
            version: '0.1.0',
            author: 'dev',
            releaseProvider: 'github',
            ghOwner: 'acme',
          }),
        /not empty/i,
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

describe('scaffoldApp happy path', { concurrency: false }, () => {
  let targetDir;

  before(async () => {
    targetDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'risotron-scaffold-ok-'),
    );
  });

  after(async () => {
    if (targetDir) {
      await fs.rm(targetDir, { recursive: true, force: true });
    }
  });

  test('creates expected files and rewrites dependency ref', async () => {
    const result = await scaffoldApp({
      targetDir,
      appName: 'Demo App',
      appSlug: 'demo-app',
      version: '0.1.0',
      author: 'Alice',
      releaseProvider: 'github',
      ghOwner: 'acme-corp',
    });

    assert.equal(result.targetDir, targetDir);

    const relPaths = new Set(
      result.filesCreated.map((p) => p.replaceAll('\\', '/')),
    );

    // AC-5.1
    assert.ok(relPaths.has('package.json'), 'package.json present');
    assert.ok(relPaths.has('risotron.config.ts'), 'risotron.config.ts present');
    assert.ok(relPaths.has('README.md'), 'README.md present');
    assert.ok(relPaths.has('.gitignore'), '.gitignore present');
    assert.ok(
      relPaths.has('vendor/risotron-runtime-0.1.0.tgz'),
      'vendor tarball present',
    );

    // AC-5.8 — no .tmpl survivors
    for (const p of relPaths) {
      assert.ok(!p.endsWith('.tmpl'), `no .tmpl remaining (${p})`);
    }

    // AC-5.2
    const pkgRaw = await fs.readFile(
      path.join(targetDir, 'package.json'),
      'utf8',
    );
    const pkg = JSON.parse(pkgRaw);
    assert.equal(pkg.name, 'demo-app');
    assert.equal(pkg.productName, 'Demo App');
    assert.equal(pkg.author, 'Alice');
    assert.equal(
      pkg.dependencies['@risotron/runtime'],
      'file:./vendor/risotron-runtime-0.1.0.tgz',
    );

    // AC-5.3
    const cfg = await fs.readFile(
      path.join(targetDir, 'risotron.config.ts'),
      'utf8',
    );
    assert.ok(cfg.includes("owner: 'acme-corp'"), 'ghOwner baked into config');
    assert.ok(
      cfg.includes("releaseProvider: 'github'"),
      'releaseProvider baked in',
    );
    assert.ok(
      cfg.includes("name: 'demo-app-releases'"),
      'releases repo name baked in',
    );
  });
});
