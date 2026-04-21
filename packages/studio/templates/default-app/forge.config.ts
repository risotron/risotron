export default {
  packagerConfig: {
    osxSign: false,
    osxNotarize: false,
  },
  makers: [
    { name: '@electron-forge/maker-dmg', config: {} },
    { name: '@electron-forge/maker-zip', config: { platforms: ['darwin'] } },
  ],
  hooks: {
    postPackage: async (_config, result) => {
      const { execSync } = await import('node:child_process');
      for (const outPath of result.outputPaths) {
        const fs = await import('node:fs');
        const entries = fs.readdirSync(outPath).filter((f) => f.endsWith('.app'));
        for (const appName of entries) {
          execSync(`codesign --force --deep --sign - "${outPath}/${appName}"`, {
            stdio: 'inherit',
          });
        }
      }
    },
  },
};
