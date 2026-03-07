# Your Little Oyachi 2

A cozy Three.js pet game that runs in the browser.

## Structure

- `app/` - browser game runtime (HTML, CSS, Three.js)
- `scripts/` - local dev server helpers

`index.html` at the repo root redirects to `app/index.html`.

## Run locally

Browser mode:

- macOS/Linux: `./scripts/dev-server.sh`
- macOS (double click): `./scripts/dev-server.command`
- Windows: `scripts\dev-server.bat`

Default URL: `http://127.0.0.1:8080/app/index.html`

## Controls

- Click Oyachi to pet
- Double-click floor to move (room + garden)
- Click doors to switch rooms
- Drag to orbit camera, scroll to zoom

Audio unlocks on first user interaction.
