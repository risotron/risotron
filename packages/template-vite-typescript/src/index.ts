import path from 'node:path';

import type {
  ForgeListrTaskDefinition,
  InitTemplateOptions,
} from '@electron-forge/shared-types';
import { BaseTemplate } from '@electron-forge/template-base';
import fs from 'fs-extra';

/**
 * RisoTron Forge template with Vite + TypeScript + secure Electron defaults.
 *
 * Extends Electron Forge's BaseTemplate to provide:
 * - Vite bundler for main, preload, and renderer
 * - Strict TypeScript configuration
 * - Secure BrowserWindow defaults (contextIsolation, sandbox, no nodeIntegration)
 * - Functional contextBridge preload stub
 * - FusesPlugin with hardened defaults
 */
class RisoTronTemplate extends BaseTemplate {
  public templateDir = path.resolve(__dirname, '..', 'tmpl');

  public async initializeTemplate(
    directory: string,
    options: InitTemplateOptions
  ): Promise<ForgeListrTaskDefinition[]> {
    const superTasks = await super.initializeTemplate(directory, options);

    return [
      ...superTasks,
      {
        title: 'Setting up RisoTron Forge configuration',
        task: async () => {
          // Copy forge config with Vite + Fuses plugins
          await this.copyTemplateFile(directory, 'forge.config.ts');

          // Remove the base template's JS config (we use TS)
          await fs.remove(path.resolve(directory, 'forge.config.js'));
        },
      },
      {
        title: 'Setting up Vite configuration',
        task: async () => {
          await this.copyTemplateFile(directory, 'vite.main.config.ts');
          await this.copyTemplateFile(directory, 'vite.preload.config.ts');
          await this.copyTemplateFile(directory, 'vite.renderer.config.ts');
        },
      },
      {
        title: 'Setting up TypeScript configuration',
        task: async () => {
          const tsconfigPath = path.resolve(directory, 'tsconfig.json');
          await fs.remove(tsconfigPath);
          await this.copyTemplateFile(directory, 'tsconfig.json');

          // Copy Vite/Electron type declarations
          await this.copyTemplateFile(directory, 'forge.env.d.ts');
        },
      },
      {
        title: 'Creating RisoTron source files',
        task: async () => {
          // Remove base template's default src files
          await fs.remove(path.resolve(directory, 'src'));

          // Copy RisoTron source structure
          // copyTemplateFile(dir, relativePath) copies tmpl/{relativePath} → {dir}/{relativePath}
          await this.copyTemplateFile(directory, 'src/main/index.ts');
          await this.copyTemplateFile(directory, 'src/preload/preload.ts');
          await this.copyTemplateFile(directory, 'src/renderer/index.html');
          await this.copyTemplateFile(directory, 'src/renderer/renderer.ts');
          await this.copyTemplateFile(directory, 'src/renderer/styles.css');
        },
      },
    ];
  }
}

export default new RisoTronTemplate();
