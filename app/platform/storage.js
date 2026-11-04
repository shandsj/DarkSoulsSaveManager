const fs = require('fs');
const path = require('path');

function ensureDirectory(directory, fileSystem) {
  if (fileSystem.existsSync(directory)) return;

  const parent = path.dirname(directory);
  if (parent !== directory && !fileSystem.existsSync(parent)) {
    ensureDirectory(parent, fileSystem);
  }

  try {
    fileSystem.mkdirSync(directory);
  } catch (error) {
    // Another process may have created the directory between the check and mkdir.
    if (!fileSystem.existsSync(directory)) throw error;
  }
}

function copyDirectory(source, destination, fileSystem) {
  if (!fileSystem.existsSync(source)) return;
  ensureDirectory(destination, fileSystem);
  fileSystem.readdirSync(source).forEach(name => {
    const from = path.join(source, name);
    const to = path.join(destination, name);
    const stat = fileSystem.statSync(from);
    if (stat.isDirectory()) {
      copyDirectory(from, to, fileSystem);
    } else if (!fileSystem.existsSync(to)) {
      fileSystem.copyFileSync(from, to);
    }
  });
}

/**
 * Establish writable per-user storage and migrate the legacy working-directory
 * layout without deleting or overwriting any existing user data.
 */
function initializeStorage(options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  if (!options.userDataPath) throw new Error('userDataPath is required');

  const userDataPath = path.resolve(options.userDataPath);
  const legacyDirectory = path.resolve(options.legacyDirectory || process.cwd());
  const settingsPath = path.join(userDataPath, 'settings.json');
  const savesPath = path.join(userDataPath, 'saves');
  ensureDirectory(userDataPath, fileSystem);

  const legacySavesPath = path.join(legacyDirectory, 'saves');
  if (!fileSystem.existsSync(savesPath) && fileSystem.existsSync(legacySavesPath)) {
    copyDirectory(legacySavesPath, savesPath, fileSystem);
  } else {
    ensureDirectory(savesPath, fileSystem);
  }

  if (!fileSystem.existsSync(settingsPath)) {
    const legacySettingsPath = path.join(legacyDirectory, 'settings.json');
    if (fileSystem.existsSync(legacySettingsPath)) {
      const settings = JSON.parse(fileSystem.readFileSync(legacySettingsPath, 'utf8'));
      if (settings.settings && settings.settings.saveDirectory &&
          !path.isAbsolute(settings.settings.saveDirectory)) {
        settings.settings.saveDirectory = savesPath;
      }
      fileSystem.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    }
  }

  return { userDataPath, settingsPath, savesPath };
}

module.exports = { initializeStorage };
