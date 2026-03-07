# Your Little Oyachi 2

A cozy Three.js pet game, packaged as a desktop app with Tauri.

## Structure

- `app/` - browser game runtime (HTML, CSS, Three.js)
- `src-tauri/` - Tauri host and bundle config
- `scripts/` - local dev and build helpers

`index.html` at the repo root redirects to `app/index.html`.

## Run locally

Browser mode:

- macOS/Linux: `./scripts/dev-server.sh`
- macOS (double click): `./scripts/dev-server.command`
- Windows: `scripts\dev-server.bat`

Default URL: `http://127.0.0.1:8080/app/index.html`

Desktop dev mode:

```bash
bun install
bun run dev
```

## Controls

- Click Oyachi to pet
- Double-click floor to move (room + garden)
- Click doors to switch rooms
- Drag to orbit camera, scroll to zoom

Audio unlocks on first user interaction.

## Build desktop app

```bash
bun run build
bun run build:debug
```

Helper scripts:

- macOS/Linux: `./scripts/build-desktop.sh`
- Windows: `scripts\build-desktop.bat`

Output folders:

- Release: `src-tauri/target/release/bundle`
- Debug: `src-tauri/target/debug`

## CI

Workflow: `.github/workflows/tauri-builds.yml`

Build targets:

- Linux (`.AppImage`)
- Windows (`.exe` / NSIS)
- macOS (`.app`)
