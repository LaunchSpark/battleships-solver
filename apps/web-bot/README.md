# web-bot

Responsive React web app for the Battleship Bot. Intended to run in desktop and mobile browsers and build as static assets for GitHub Pages.

## Development
- Offline-friendly build powered by a simple Node copy script (`npm run build`).
- Run `npm install` from the repo root to ensure React and engine dependencies exist (packages are already vendored in `node_modules` for offline execution).
- Create a production build: `npm run build` (outputs to `apps/web-bot/dist`).
- Preview the production build locally by serving `apps/web-bot/dist` with any static file server.

## UI data flow
- Ensure the UI passes a `gameData` object directly into `getBestMove(gameData)` with the following shape:
  - `highHeat`: the highest `heat` value present on the board (ties are not important).
  - `board`: a 2D array of tile objects `{ status: 0|1|2|3, heat: number }`, where `status` values map to unknown, miss, hit, and sunk.
  - `boats`: an array of boats `{ name, length, sunk }` so the engine knows which ships remain.
  - The engine rebuilds the heat map from `status` values and remaining boats, so make sure hits/misses/sunk tiles are kept up to date before invoking the bot.
