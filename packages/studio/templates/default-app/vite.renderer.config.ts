import { defineConfig } from 'vite';

// Renderer build config for @electron-forge/plugin-vite.
export default defineConfig({
  root: 'src',
  build: {
    outDir: '../.vite/renderer/main_window',
    emptyOutDir: true,
  },
});
