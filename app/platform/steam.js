const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Parse the Valve KeyValues subset used by Steam's libraryfolders.vdf.
 * Supports both legacy string entries and modern entries containing a "path".
 */
function parseVdf(source) {
  const tokens = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (ch === '{' || ch === '}') { tokens.push(ch); i++; continue; }
    if (ch === '"') {
      i++;
      let value = '';
      while (i < source.length && source[i] !== '"') {
        if (source[i] === '\\' && i + 1 < source.length) {
          i++;
          value += source[i] === 'n' ? '\n' : source[i];
        } else {
          value += source[i];
        }
        i++;
      }
      if (source[i] !== '"') throw new Error('Unterminated quoted value in VDF');
      i++;
      tokens.push(value);
      continue;
    }

    const start = i;
    while (i < source.length && !/\s|[{}]/.test(source[i])) i++;
    tokens.push(source.slice(start, i));
  }

  let cursor = 0;
  function readObject(nested) {
    const result = {};
    while (cursor < tokens.length) {
      if (tokens[cursor] === '}') {
        if (!nested) throw new Error('Unexpected closing brace in VDF');
        cursor++;
        return result;
      }
      const key = tokens[cursor++];
      if (key === '{') throw new Error('Unexpected opening brace in VDF');
      if (cursor >= tokens.length) throw new Error('Missing value for VDF key: ' + key);
      if (tokens[cursor] === '{') {
        cursor++;
        result[key] = readObject(true);
      } else {
        result[key] = tokens[cursor++];
      }
    }
    if (nested) throw new Error('Unclosed object in VDF');
    return result;
  }

  return readObject(false);
}

function uniquePaths(paths) {
  const seen = new Set();
  return paths.filter(value => {
    if (!value) return false;
    const normalized = path.resolve(value);
    const key = process.platform === 'win32' ? normalized.toLowerCase() : normalized;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Return likely Steam roots on Linux. Explicit STEAM_DIR is checked first.
 * Flatpak's per-user Steam data directory is included alongside native installs.
 */
function getSteamRoots(options) {
  options = options || {};
  const platform = options.platform || process.platform;
  const home = options.home || os.homedir();
  const env = options.env || process.env;

  if (platform !== 'linux') return env.STEAM_DIR ? [path.resolve(env.STEAM_DIR)] : [];

  return uniquePaths([
    env.STEAM_DIR,
    env.STEAM_COMPAT_CLIENT_INSTALL_PATH,
    path.join(home, '.steam', 'steam'),
    path.join(home, '.steam', 'root'),
    path.join(home, '.local', 'share', 'Steam'),
    path.join(home, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam')
  ]);
}

/**
 * Discover Steam library roots from each installation's libraryfolders.vdf.
 * The returned paths are Steam library roots, not steamapps directories.
 */
function discoverSteamLibraries(options) {
  options = options || {};
  const existsSync = options.existsSync || fs.existsSync;
  const readFileSync = options.readFileSync || fs.readFileSync;
  const roots = options.roots || getSteamRoots(options);
  const libraries = [];

  roots.forEach(root => {
    const manifest = path.join(root, 'steamapps', 'libraryfolders.vdf');
    libraries.push(root);
    if (!existsSync(manifest)) return;

    try {
      const parsed = parseVdf(readFileSync(manifest, 'utf8'));
      const folders = parsed.libraryfolders || parsed.LibraryFolders || {};
      Object.keys(folders).forEach(key => {
        const entry = folders[key];
        const libraryPath = typeof entry === 'string' ? entry : entry && entry.path;
        if (libraryPath) libraries.push(libraryPath);
      });
    } catch (error) {
      // An unreadable or malformed secondary library must not hide other roots.
    }
  });

  return uniquePaths(libraries).filter(existsSync);
}

module.exports = {
  parseVdf,
  getSteamRoots,
  discoverSteamLibraries
};
