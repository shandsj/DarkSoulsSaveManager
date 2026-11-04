const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
const dialog = electron.dialog;
const shell = electron.shell;
const globalShortcut = electron.globalShortcut;
const path = require('path');
const url = require('url');

let mainWindow;

app.setAppUserModelId('com.omgftw.dssm');
app.setAsDefaultProtocolClient('dssm');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  if (!app.isPackaged) mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

ipcMain.on('app:get-path', (event, name) => { event.returnValue = app.getPath(name); });
ipcMain.handle('dialog:open', async (event, options) => {
  const owner = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(owner || undefined, options || {});
  return result.filePaths || [];
});
ipcMain.handle('dialog:message', async (event, options) => {
  const owner = BrowserWindow.fromWebContents(event.sender);
  return dialog.showMessageBox(owner || undefined, options || {});
});
ipcMain.handle('shell:show-item', (_event, filePath) => shell.showItemInFolder(filePath));
ipcMain.handle('window:close', event => {
  const owner = BrowserWindow.fromWebContents(event.sender);
  if (owner) owner.close();
});
ipcMain.handle('shortcuts:register', (_event, accelerators) => {
  globalShortcut.unregisterAll();
  const registered = {};
  Object.keys(accelerators || {}).forEach(action => {
    const accelerator = accelerators[action];
    if (!accelerator) return;
    registered[action] = globalShortcut.register(accelerator, () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('shortcut:triggered', action);
      }
    });
  });
  return registered;
});

app.whenReady().then(createWindow);
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', function () {
  if (mainWindow === null) createWindow();
});
app.on('will-quit', function () {
  globalShortcut.unregisterAll();
});
