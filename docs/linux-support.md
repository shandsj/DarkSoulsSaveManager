# Linux and Steam/Proton support

The Linux port is being developed with Bazzite as the primary validation platform, while targeting ordinary Linux desktop installations as well.

## Steam library discovery

The platform layer checks common native Steam locations and the per-user Flatpak Steam location. It reads each installation's `steamapps/libraryfolders.vdf` and supports both the legacy string format and the current object format.

Known game saves are discovered in each game's Proton prefix under `steamapps/compatdata/<appid>/pfx`. The current profiles include Dark Souls Remastered, Dark Souls II: Scholar of the First Sin, Dark Souls III, and Elden Ring. Dark Souls Remastered is searched in the Windows Documents/NBGI save location rather than the AppData/Roaming location used by some other titles.

## Data safety requirements

- Keep application settings and managed backups in a per-user writable application-data directory.
- Never write into the installed application directory.
- Resolve save locations from the selected Steam library and game's Proton prefix.
- Create a verified backup before replacing a live save.
- Warn when the target game is running or Steam Cloud may be synchronizing.
- Keep Windows save discovery and packaging functional.
- Migration copies legacy settings and backup files without deleting the originals or overwriting existing destination data.

## Electron modernization

The application now targets Electron 45 and uses a preload bridge with context isolation for native dialogs, shell integration, application paths, and global shortcuts. The renderer still has Node integration enabled to support the legacy AngularJS code; removing that remaining dependency is a separate hardening step.

## Packaging direction

The first Linux package is an AppImage, built by the Linux GitHub Actions workflow. This avoids requiring changes to Bazzite's immutable host operating system. Flatpak packaging remains a follow-up target; RPM packaging can be added for conventional Fedora-based installations.
