const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splashApi', {
  sendCheck: (message) => ipcRenderer.send('check', message),
  onResponse: (callback) =>
    ipcRenderer.on('response', (_event, arg) => callback(arg)),
});
