#!/usr/bin/env node

// RisoTron — CLI Initializer
// Usage: npm create risotron@latest <project-name>
//
// This thin CLI calls Electron Forge's init() API with the RisoTron
// template to scaffold a new Electron app with secure defaults.

import { api } from '@electron-forge/core';
import path from 'node:path';

async function main(): Promise<void> {
  const projectDir = process.argv[2];

  if (!projectDir) {
    console.error('Usage: npm create risotron@latest <project-name>');
    console.error('');
    console.error('Example:');
    console.error('  npm create risotron@latest my-app');
    process.exit(1);
  }

  // Resolve the target directory
  const dir = path.resolve(process.cwd(), projectDir);

  console.log(`\n⚡ Creating RisoTron app in ${dir}...\n`);

  try {
    await api.init({
      dir,
      template: require.resolve('@risotron/template-vite-typescript'),
      interactive: false,
    });

    console.log(`\n✅ RisoTron app created successfully!\n`);
    console.log(`  Next steps:\n`);
    console.log(`    cd ${projectDir}`);
    console.log(`    npm install`);
    console.log(`    npm start\n`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Failed to create RisoTron app: ${message}\n`);
    process.exit(1);
  }
}

main();
