const fs = require('fs');
const path = require('path');

const GAME_PROFILES = [
  {
    id: 'dark-souls-remastered',
    name: 'Dark Souls Remastered',
    appId: '570940',
    locations: [
      { base: 'Documents', directory: 'NBGI/DARK SOULS REMASTERED', filename: 'DRAKS0005.sl2' },
      { base: 'Documents', directory: 'NBGI/570940', filename: '*.sl2' },
      { base: 'Documents', directory: 'FromSoftware/DARK SOULS REMASTERED', filename: '*.sl2' }
    ]
  },
  {
    id: 'dark-souls-3',
    name: 'Dark Souls III',
    appId: '374320',
    locations: [
      { base: 'AppData/Roaming', directory: 'DarkSoulsIII', filename: 'DS30000.sl2' }
    ]
  },
  {
    id: 'dark-souls-2-scholar',
    name: 'Dark Souls II: Scholar of the First Sin',
    appId: '335300',
    locations: [
      { base: 'AppData/Roaming', directory: 'DarkSoulsII', filename: 'DS2SOFS0000.sl2' }
    ]
  },
  {
    id: 'elden-ring',
    name: 'Elden Ring',
    appId: '1245620',
    locations: [
      { base: 'AppData/Roaming', directory: 'EldenRing', filename: 'ER0000.sl2' }
    ]
  }
];

function listFiles(directory, fileSystem) {
  if (!fileSystem.existsSync(directory)) return [];
  return fileSystem.readdirSync(directory).reduce((files, name) => {
    const fullPath = path.join(directory, name);
    let stat;
    try {
      stat = fileSystem.statSync(fullPath);
    } catch (error) {
      return files;
    }
    if (stat.isFile() && /\.sl2$/i.test(name)) files.push(fullPath);
    return files;
  }, []);
}

function findProfileSaves(prefixPath, profile, fileSystem) {
  const userRoot = path.join(prefixPath, 'drive_c', 'users');
  if (!fileSystem.existsSync(userRoot)) return [];

  let users;
  try {
    users = fileSystem.readdirSync(userRoot);
  } catch (error) {
    return [];
  }

  const saves = [];
  users.forEach(user => {
    profile.locations.forEach(location => {
      const directory = path.join(userRoot, user, location.base, location.directory);
      if (!fileSystem.existsSync(directory)) return;

      if (location.filename === '*.sl2') {
        fileSystem.readdirSync(directory).forEach(accountDirectory => {
          const accountPath = path.join(directory, accountDirectory);
          let stat;
          try { stat = fileSystem.statSync(accountPath); } catch (error) { return; }
          if (stat.isDirectory()) saves.push.apply(saves, listFiles(accountPath, fileSystem));
        });
      } else {
        const directPath = path.join(directory, location.filename);
        if (fileSystem.existsSync(directPath)) saves.push(directPath);

        // FromSoftware titles store saves in an account-ID subfolder.
        try {
          fileSystem.readdirSync(directory).forEach(accountDirectory => {
            const accountPath = path.join(directory, accountDirectory, location.filename);
            if (fileSystem.existsSync(accountPath)) saves.push(accountPath);
          });
        } catch (error) {
          // The direct save may still have been found.
        }
      }
    });
  });

  return Array.from(new Set(saves));
}

/**
 * Search each discovered Steam library for known FromSoftware Proton save files.
 * Scans the game's own compatdata prefix first, then other prefixes because
 * users can run games through custom/non-Steam launch entries.
 */
function discoverProtonSaves(libraries, options) {
  options = options || {};
  const fileSystem = options.fs || fs;
  const profiles = options.profiles || GAME_PROFILES;
  const results = [];

  profiles.forEach(profile => {
    libraries.forEach(library => {
      const compatdata = path.join(library, 'steamapps', 'compatdata');
      if (!fileSystem.existsSync(compatdata)) return;

      const preferredPrefix = path.join(compatdata, profile.appId, 'pfx');
      if (fileSystem.existsSync(preferredPrefix)) {
        findProfileSaves(preferredPrefix, profile, fileSystem).forEach(savePath => {
          results.push({ game: profile.id, gameName: profile.name, appId: profile.appId, path: savePath });
        });
      }
    });
  });

  return results;
}

module.exports = { GAME_PROFILES, discoverProtonSaves };
