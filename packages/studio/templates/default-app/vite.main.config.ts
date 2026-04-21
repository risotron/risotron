import { defineConfig } from 'vite';

// Main-process build config for @electron-forge/plugin-vite.
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron'],
    },
  },
});
