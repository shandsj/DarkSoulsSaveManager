# Dark Souls Save Manager

A desktop application for backing up, organizing, and restoring single-file game saves.

Originally confirmed for Dark Souls, Dark Souls 2, Dark Souls 3, and Elden Ring.

## Development

Requires Node.js 22 or newer.

```sh
npm install
npm start
```

Run the platform tests:

```sh
npm test
```

## Build packages

Linux AppImage:

```sh
npm run dist:linux
```

Windows installer:

```sh
npm run dist:windows
```

macOS disk image:

```sh
npm run dist:mac
```

Packages are written to `dist/`.

## Linux support

Linux support is being developed in the `feature/linux-native-build` branch, with Bazzite as the primary test platform.

The Linux platform layer discovers native and Flatpak Steam libraries, parses both generations of Steam's `libraryfolders.vdf`, and locates known game saves inside the corresponding Proton prefixes. Detected save files are offered on the welcome screen, alongside manual file selection.

Settings and backup files are stored in Electron's per-user application data directory. Existing working-directory settings and backups are migrated without deleting the originals.

See [Linux support notes](docs/linux-support.md) for compatibility details and data-safety goals.
