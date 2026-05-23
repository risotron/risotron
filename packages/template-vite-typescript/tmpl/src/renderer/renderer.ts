// RisoTron — Renderer Entry
// This script runs in the renderer process (browser context).
// It can access the risotron API exposed by the preload script.

// Display version information from the preload bridge
const setVersion = (id: string, getter: () => string): void => {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = getter();
  }
};

// window.risotron is exposed by the preload script via contextBridge
declare global {
  interface Window {
    risotron: {
      versions: {
        node: () => string;
        chrome: () => string;
        electron: () => string;
      };
    };
  }
}

setVersion('node-version', window.risotron.versions.node);
setVersion('chrome-version', window.risotron.versions.chrome);
setVersion('electron-version', window.risotron.versions.electron);

console.log('👋 RisoTron renderer loaded');
