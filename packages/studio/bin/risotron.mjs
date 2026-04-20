#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  await readFile(join(__dirname, '..', 'package.json'), 'utf8')
);

const program = new Command();

program
  .name('risotron')
  .description('Risotron developer tools')
  .version(packageJson.version, '-v, --version');

program
  .command('studio')
  .description('Start the local Studio server')
  .option('-p, --port <port>', 'preferred Studio server port', (value) => {
    const port = Number.parseInt(value, 10);

    if (!Number.isInteger(port) || port <= 0) {
      throw new Error(`Invalid port: ${value}`);
    }

    return port;
  })
  .action(async (options) => {
    const { runStudio } = await import('../dist/cli/studio.js');
    await runStudio({ port: options.port });
  });

program
  .command('publish')
  .description('Publish an app release')
  .action(async () => {
    const { runPublish } = await import('../dist/cli/publish.js');
    await runPublish();
  });

await program.parseAsync(process.argv);
