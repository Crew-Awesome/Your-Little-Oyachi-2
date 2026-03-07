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

- macOS/Linux: `./scripts/build-electrobun.sh stable`
- macOS double-click: `./scripts/build-electrobun.command`
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
   - Linux: extract/run from the generated linux bundle folder or tar.gz installer package.
4. If the app does not start on Linux, install runtime dependencies first:

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
