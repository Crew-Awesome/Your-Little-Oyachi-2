# Your Little Oyachi 2

A cozy in-browser Three.js game prototype featuring Oyachi, two rooms, interactions, and handcrafted pastel props.

## Project Status

This game is **still in development**.

It is currently developed by **ImMalloy** only, for now. Contributions are welcome.

## Repository Structure

- `app/index.html` - app entrypoint
- `app/src/main.js` - Three.js scene/game logic
- `app/styles/main.css` - app styles
- `assets/` - sprites and audio assets
- `scripts/` - local development server scripts
- `index.html` - root redirect to `app/index.html`

## Current Features

- Pink room and closet room with door transitions
- Oyachi idle/walk behavior, pet reaction, hearts, and SFX
- Double-tap floor command for movement in pink room
- Hardcoded pink furniture layout (bed, dresser, table)
- Closet decorative box props

## Run Locally

Use any of these scripts:

- macOS/Linux: `scripts/dev-server.sh`
- macOS double-click helper: `scripts/dev-server.command`
- Windows: `scripts/dev-server.bat`

Default server URL is `http://127.0.0.1:8080/app/index.html`.

You can override the port with `PORT`, for example:

```bash
PORT=9000 scripts/dev-server.sh
```

## Contributing

Contributions are open. If you want to help, open an issue or submit a PR with clear notes and screenshots/videos for visual changes.
