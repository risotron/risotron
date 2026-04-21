import { defineConfig } from 'vite';

// Preload build config for @electron-forge/plugin-vite.
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron'],
    },
  },
});
