// Preload for the splash window. The splash runs with sandbox + contextIsolation,
// so this is the only bridge between renderer and main. Surface is intentionally
// minimal (only the two channels the splash uses) — do not extend without reason.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splashApi', {
  sendCheck: (message) => ipcRenderer.send('check', message),
  onResponse: (callback) => {
    const handler = (_event, arg) => callback(arg);
    ipcRenderer.on('response', handler);
    return () => ipcRenderer.removeListener('response', handler);
  },
});
