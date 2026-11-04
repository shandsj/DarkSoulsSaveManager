const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { discoverProtonSaves } = require('../app/platform/protonSaves');

function memoryFs(files, directories) {
  const dirs = new Set(directories || []);
  Object.keys(files).forEach(file => {
    let parent = path.dirname(file);
    while (parent !== path.dirname(parent)) {
      dirs.add(parent);
      parent = path.dirname(parent);
    }
  });
  return {
    existsSync: value => Object.prototype.hasOwnProperty.call(files, value) || dirs.has(value),
    readdirSync: value => {
      const entries = new Set();
      Object.keys(files).concat(Array.from(dirs)).forEach(candidate => {
        if (path.dirname(candidate) === value) entries.add(path.basename(candidate));
      });
      return Array.from(entries);
    },
    statSync: value => ({
      isDirectory: () => dirs.has(value),
      isFile: () => Object.prototype.hasOwnProperty.call(files, value)
    })
  };
}

test('discovers Dark Souls Remastered saves in the Documents Proton path', () => {
  const library = '/games/SteamLibrary';
  const save = path.join(library, 'steamapps/compatdata/570940/pfx/drive_c/users/steamuser/Documents/NBGI/DARK SOULS REMASTERED/76561198000000000/DRAKS0005.sl2');
  const fs = memoryFs({ [save]: 'save-data' });
  const found = discoverProtonSaves([library], { fs });
  assert.equal(found.length, 1);
  assert.equal(found[0].game, 'dark-souls-remastered');
  assert.equal(found[0].path, save);
});

test('discovers Dark Souls III saves under AppData Roaming', () => {
  const library = '/steam';
  const save = path.join(library, 'steamapps/compatdata/374320/pfx/drive_c/users/steamuser/AppData/Roaming/DarkSoulsIII/76561198000000000/DS30000.sl2');
  const fs = memoryFs({ [save]: 'save-data' });
  const found = discoverProtonSaves([library], { fs });
  assert.equal(found.length, 1);
  assert.equal(found[0].game, 'dark-souls-3');
  assert.equal(found[0].path, save);
});

test('ignores prefixes without a known save file', () => {
  const library = '/steam';
  const prefix = path.join(library, 'steamapps/compatdata/570940/pfx');
  const fs = memoryFs({}, [prefix]);
  assert.deepEqual(discoverProtonSaves([library], { fs }), []);
});
