# Your Little Oyachi 2

This project is a sequel to the original Your Little Oyachi game.

It is a cozy Three.js pet experience where you can interact with Oyachi, move between rooms, and keep evolving the world with new features and visuals.

This repository now runs as an Electrobun desktop app.

## Run with Electrobun

```bash
bun install
bun run dev
```

## Build desktop app

```bash
bun run build
```

Build channels:

```bash
bun run build:dev
bun run build:canary
bun run build:stable
```

## Build scripts (local)

From `scripts/`:

- macOS/Linux: `./scripts/build-electrobun.sh`
- Windows: `scripts\build-electrobun.bat`

Both scripts open an interactive chooser menu (TUI-style) so you can pick:
- DEV/CANARY/STABLE build
- Build all channels
- Open build folder
- Show format support

Non-interactive mode is still available:
- macOS/Linux: `./scripts/build-electrobun.sh stable`
- Windows: `scripts\build-electrobun.bat stable`

Notes:
- Local scripts build for your current host OS only.
- For Windows + macOS + Linux builds in one flow, use the GitHub Actions workflow: `.github/workflows/electrobun-builds.yml`.

## Output formats

Electrobun currently supports:
- Windows: `.exe`
- macOS: `.app`, `.dmg`
- Linux: tar.gz installer/bundle

Requested formats that Electrobun does not currently generate directly:
- Windows: `.msi`
- Linux: `.AppImage`, `.deb`, `.rpm`

## How to test built apps

1. Build locally (`bun run build` or one of the scripts above).
2. Open the `build/` folder.
3. Run the platform output:
   - Windows: launch the generated `.exe` in the Windows build folder.
   - macOS: open the generated `.app` (or mount/open `.dmg` and run the app inside).
   - Linux: run the generated `.AppImage` (`chmod +x file.AppImage && ./file.AppImage`).
4. Important Linux note: do not run `bin/launcher` directly from extracted internals; use the top-level app entry or AppImage.
5. Linux graphics fallback: the AppImage enables software GL by default to avoid `GLXBadWindow` on some drivers. To try hardware acceleration, run with `OYACHI_FORCE_SOFTWARE_GL=0 ./YourLittleOyachi2-stable.AppImage`.
6. If the app does not start on Linux, install runtime dependencies first:

```bash
sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev
```

## CI desktop builds

This repo includes a cross-platform GitHub Actions workflow that builds on:
- `ubuntu-latest`
- `macos-latest`
- `windows-latest`

Each run uploads the generated `build/**` directory as an artifact.

Core entry points:
- `electrobun.config.ts`
- `src/bun/main.ts`
- `src/views/mainview/index.ts`
- `src/views/mainview/index.html`

Original game:
- https://github.com/Crew-Awesome/Your-Little-Oyachi-1

## Status

This sequel is still in active development.

Currently developed by **ImMalloy**. Contributions are welcome.
