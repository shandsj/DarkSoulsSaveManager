# Linux and Steam/Proton support

The Linux port is being developed with Bazzite as the primary validation platform, while targeting ordinary Linux desktop installations as well.

## Steam library discovery

The platform layer checks common native Steam locations and the per-user Flatpak Steam location. It reads each installation's `steamapps/libraryfolders.vdf` and supports both the legacy string format and the current object format.

Steam library discovery is only the first stage. Game-specific save discovery must also account for Proton prefixes under `steamapps/compatdata/<appid>/pfx`. The application must never assume that the Steam client is installed in one fixed directory.

## Data safety requirements

- Keep application settings and managed backups in a per-user writable application-data directory.
- Never write into the installed application directory.
- Resolve save locations from the selected Steam library and game's Proton prefix.
- Create a verified backup before replacing a live save.
- Warn when the target game is running or Steam Cloud may be synchronizing.
- Keep Windows save discovery and packaging functional.

## Packaging direction

Bazzite is an image-based Fedora system, so the first Linux deliverable should not require writing into the host OS. AppImage and Flatpak are the initial packaging candidates. RPM packaging can be added for conventional Fedora-based installations after the runtime is modernized.
