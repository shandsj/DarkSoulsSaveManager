const test = require('node:test');
const assert = require('node:assert/strict');
const { parseVdf, getSteamRoots, discoverSteamLibraries } = require('../app/platform/steam');

test('parses modern Steam libraryfolders entries', () => {
  const data = parseVdf('"libraryfolders" { "0" { "path" "/home/user/.local/share/Steam" } "1" { "path" "/mnt/games/SteamLibrary" } }');
  assert.equal(data.libraryfolders['1'].path, '/mnt/games/SteamLibrary');
});

test('parses legacy Steam libraryfolders string entries and comments', () => {
  const data = parseVdf('// Steam library list\n"LibraryFolders" { "0" "/home/user/Steam" "1" "/mnt/Steam Library" }');
  assert.equal(data.LibraryFolders['0'], '/home/user/Steam');
  assert.equal(data.LibraryFolders['1'], '/mnt/Steam Library');
});

test('finds native and Flatpak Steam roots on Linux', () => {
  const roots = getSteamRoots({ platform: 'linux', home: '/home/test', env: {} });
  assert.ok(roots.includes('/home/test/.local/share/Steam'));
  assert.ok(roots.includes('/home/test/.var/app/com.valvesoftware.Steam/.local/share/Steam'));
});

test('discovers libraries from a VDF manifest', () => {
  const files = {
    '/steam/steamapps/libraryfolders.vdf': '"libraryfolders" { "0" { "path" "/steam" } "1" { "path" "/games/SteamLibrary" } }'
  };
  const found = discoverSteamLibraries({
    roots: ['/steam'],
    existsSync: p => p === '/steam' || p === '/games/SteamLibrary' || Object.prototype.hasOwnProperty.call(files, p),
    readFileSync: p => files[p]
  });
  assert.deepEqual(found, ['/steam', '/games/SteamLibrary']);
});
