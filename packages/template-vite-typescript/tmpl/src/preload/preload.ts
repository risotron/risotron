// RisoTron — Preload Script
// This script runs in the renderer process before the web page loads.
// It uses contextBridge to safely expose selected APIs to the renderer.
//
// With sandbox: true and contextIsolation: true, this is the ONLY way
// to bridge between Node.js and the renderer world.

import { contextBridge } from 'electron';

// Expose version info to the renderer via window.risotron
contextBridge.exposeInMainWorld('risotron', {
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
  },
  // Add your own IPC handlers here using ipcRenderer.invoke()
  // Example:
  //   ping: () => ipcRenderer.invoke('ping'),
});
