const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getData: () => ipcRenderer.invoke('get-data'),
});
