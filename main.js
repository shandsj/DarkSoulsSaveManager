const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
const dialog = electron.dialog;
const shell = electron.shell;
const globalShortcut = electron.globalShortcut;
const path = require('path');
const fs = require('fs');
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

  if (!app.isPackaged && !process.argv.includes('--smoke-test')) mainWindow.webContents.openDevTools();

  if (process.argv.includes('--smoke-test')) {
    mainWindow.webContents.once('did-finish-load', runSmokeTest);
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

ipcMain.on('app:get-path', (event, name) => { event.returnValue = app.getPath(name); });
ipcMain.handle('dialog:open', async (event, options) => {
  const owner = BrowserWindow.fromWebContents(event.sender);
  const result = owner
    ? await dialog.showOpenDialog(owner, options || {})
    : await dialog.showOpenDialog(options || {});
  return result.filePaths || [];
});
ipcMain.handle('dialog:message', async (event, options) => {
  const owner = BrowserWindow.fromWebContents(event.sender);
  return owner
    ? dialog.showMessageBox(owner, options || {})
    : dialog.showMessageBox(options || {});
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


async function waitForRenderer(expression, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (!mainWindow || mainWindow.isDestroyed()) throw new Error('Application window closed during smoke test');
    try {
      const result = await mainWindow.webContents.executeJavaScript(expression);
      if (result) return result;
    } catch (error) {
      // Angular and its route template may still be booting.
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for renderer condition: ' + expression);
}

async function runSmokeTest() {
  try {
    const fixturePath = path.join(app.getPath('temp'), 'dssm-linux-smoke-save.sl2');
    fs.writeFileSync(fixturePath, Buffer.alloc(256, 0x44));

    await waitForRenderer(
      "!!(window.angular && document.querySelector('.welcome-header') && window.electronAPI)",
      10000
    );

    await mainWindow.webContents.executeJavaScript(`
      (() => {
        const injector = angular.element(document.body).injector();
        const core = injector.get('core');
        const scope = angular.element(document.querySelector('ng-view')).scope();
        core.data.settings.notificationSound = false;
        core.data.settings.windowsNotification = false;
        core.data.settings.saveFileLocation = ${JSON.stringify(fixturePath)};
        scope.$apply(() => {
          scope.vm.saveFileLocation = ${JSON.stringify(fixturePath)};
          scope.vm.continue();
        });
        return true;
      })()
    `);

    await waitForRenderer("location.hash.indexOf('#!/main') !== -1 && !!document.querySelector('.backup-panel')", 10000);
    const mainState = await mainWindow.webContents.executeJavaScript(`
      (() => {
        const core = angular.element(document.body).injector().get('core');
        const backupPath = core.createBackup();
        return {
          heading: document.querySelector('.main-intro h1').textContent.trim(),
          backupCount: core.data.saves.length,
          backupExists: window.electronAPI.fs.existsSync(backupPath),
          backupPath
        };
      })()
    `);

    if (mainState.heading !== 'Backup collection' || mainState.backupCount !== 1 || !mainState.backupExists) {
      throw new Error('Main screen or backup smoke test failed: ' + JSON.stringify(mainState));
    }

    const restoreState = await mainWindow.webContents.executeJavaScript(`
      (() => {
        const core = angular.element(document.body).injector().get('core');
        const backup = core.data.saves[0];
        const fixturePath = ${JSON.stringify(path.join(app.getPath('temp'), 'dssm-linux-smoke-save.sl2'))};
        window.electronAPI.fs.writeFileSync(fixturePath, new Uint8Array(256).fill(0x11));
        core.restoreSave(backup.id);
        return {
          restoredByte: window.electronAPI.fs.readFileSync(fixturePath)[0],
          safetyCopyExists: window.electronAPI.fs.existsSync(fixturePath + '.bak')
        };
      })()
    `);

    if (restoreState.restoredByte !== 0x44 || !restoreState.safetyCopyExists) {
      throw new Error('Restore smoke test failed: ' + JSON.stringify(restoreState));
    }

    await mainWindow.webContents.executeJavaScript(`
      (() => {
        const scope = angular.element(document.querySelector('ng-view')).scope();
        scope.$apply(() => scope.vm.settingsPage());
      })()
    `);
    await waitForRenderer("!!(document.querySelector('.settings-screen') && document.querySelector('#backupFileFormat') && document.body.innerText.includes('Keyboard shortcuts'))", 10000);

    console.log('[smoke-test] Welcome page rendered.');
    console.log('[smoke-test] Main library rendered and backup file created.');
    console.log('[smoke-test] Restore flow replaced the live save and created a safety copy.');
    console.log('[smoke-test] Settings page rendered.');
    console.log('[smoke-test] Electron preload and filesystem bridge working.');

    app.exit(0);
  } catch (error) {
    console.error('[smoke-test] FAILED:', error && error.stack ? error.stack : error);
    app.exit(1);
  }
}

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
