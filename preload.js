const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const storage = require('./app/platform/storage');
const steam = require('./app/platform/steam');
const protonSaves = require('./app/platform/protonSaves');

const fsBridge = {
  existsSync: value => fs.existsSync(value),
  readFileSync: (value, encoding) => {
    const data = fs.readFileSync(value, encoding);
    return encoding ? data : Uint8Array.from(data);
  },
  writeFileSync: (value, data, encoding) => fs.writeFileSync(value, data, encoding),
  copyFileSync: (source, destination) => fs.copyFileSync(source, destination),
  unlinkSync: value => fs.unlinkSync(value),
  mkdirSync: (value, options) => fs.mkdirSync(value, options),
  readdirSync: value => fs.readdirSync(value),
  statSync: value => {
    const stat = fs.statSync(value);
    return { isDirectory: () => stat.isDirectory(), isFile: () => stat.isFile(), size: stat.size };
  },
  exists: (value, callback) => fs.exists(value, callback)
};

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  appData: process.env.APPDATA || null,
  fs: fsBridge,
  path: {
    join: (...parts) => path.join(...parts),
    resolve: (...parts) => path.resolve(...parts),
    basename: value => path.basename(value),
    isAbsolute: value => path.isAbsolute(value)
  },
  initializeStorage: userDataPath => storage.initializeStorage({ userDataPath }),
  discoverProtonSaves: () => protonSaves.discoverProtonSaves(steam.discoverSteamLibraries()),
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
