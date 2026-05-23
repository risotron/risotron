import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpl = join(__dirname, '..', 'tmpl');

const EXPECTED_FILES = [
  'forge.config.ts',
  'tsconfig.json',
  'forge.env.d.ts',
  'vite.main.config.ts',
  'vite.preload.config.ts',
  'vite.renderer.config.ts',
  'src/main/index.ts',
  'src/preload/preload.ts',
  'src/renderer/index.html',
  'src/renderer/renderer.ts',
  'src/renderer/styles.css',
];

test('all expected template files exist in tmpl/', () => {
  for (const file of EXPECTED_FILES) {
    assert.ok(existsSync(join(tmpl, file)), `missing: tmpl/${file}`);
  }
});

test('src/main/index.ts contains required security flags', () => {
  const content = readFileSync(join(tmpl, 'src/main/index.ts'), 'utf8');
  assert.ok(content.includes('contextIsolation: true'), 'missing contextIsolation: true');
  assert.ok(content.includes('nodeIntegration: false'), 'missing nodeIntegration: false');
  assert.ok(content.includes('sandbox: true'), 'missing sandbox: true');
});

test('forge.config.ts contains FusesPlugin', () => {
  const content = readFileSync(join(tmpl, 'forge.config.ts'), 'utf8');
  assert.ok(content.includes('FusesPlugin'), 'missing FusesPlugin');
});

test('src/preload/preload.ts contains contextBridge.exposeInMainWorld', () => {
  const content = readFileSync(join(tmpl, 'src/preload/preload.ts'), 'utf8');
  assert.ok(content.includes('contextBridge.exposeInMainWorld'), 'missing contextBridge.exposeInMainWorld');
});
