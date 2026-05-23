// RisoTron — Main Process
// This is the entry point for the Electron main process.
// It creates the application window with secure defaults.

import { app, BrowserWindow } from 'electron';
import path from 'node:path';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = (): void => {
  // Create the browser window with secure defaults.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Security: isolate renderer from Node.js
      contextIsolation: true,
      // Security: disable Node.js integration in renderer
      nodeIntegration: false,
      // Security: run renderer in sandboxed process
      sandbox: true,
    },
  });

  // Load the app.
  // In development, load from Vite dev server (HMR enabled).
  // In production, load the bundled HTML file.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open DevTools in development.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// Create window when Electron is ready.
app.on('ready', createWindow);

// Quit when all windows are closed (except on macOS).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, re-create window when dock icon is clicked and no windows open.
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
