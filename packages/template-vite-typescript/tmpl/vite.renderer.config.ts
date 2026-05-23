import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    // Electron Forge Vite plugin automatically sets target to `chromeXX` where XX is Electron's Chrome version.
  },
});
