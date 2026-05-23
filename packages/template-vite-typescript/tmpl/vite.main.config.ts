import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    // Electron Forge Vite plugin automatically sets target to `nodeXX` where XX is Electron's Node version.
  },
});
