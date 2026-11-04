const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPath: name => ipcRenderer.sendSync('app:get-path', name),
  showOpenDialog: options => ipcRenderer.invoke('dialog:open', options),
  showMessageBox: options => ipcRenderer.invoke('dialog:message', options),
  showItemInFolder: filePath => ipcRenderer.invoke('shell:show-item', filePath),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  registerShortcuts: accelerators => ipcRenderer.invoke('shortcuts:register', accelerators),
  onShortcut: callback => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('shortcut:triggered', listener);
    return () => ipcRenderer.removeListener('shortcut:triggered', listener);
  }
});
