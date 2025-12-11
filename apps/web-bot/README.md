# web-bot

Responsive React web app for the Battleship Bot. Intended to run in desktop and mobile browsers and build as static assets for GitHub Pages.

## Development
- Uses [Vite](https://vitejs.dev/) for the dev server and production build.
- Run `npm install` from the repo root to install workspace dependencies.
- Start a local dev server: `npm run dev:web` (opens at http://localhost:5173 by default).
- Create a production build: `npm run build` (outputs to `apps/web-bot/dist`).
- Preview the production build locally: `npm run preview --workspace apps/web-bot`.

## UI data flow
- Ensure the UI passes a `gameData` object directly into `getBestMove(gameData)` with the following shape:
  - `highHeat`: the highest `heat` value present on the board (ties are not important).
  - `board`: a 2D array of tile objects `{ status: 0|1|2|3, heat: number }`, where `status` values map to unknown, miss, hit, and sunk.
  - `boats`: an array of boats `{ name, length, sunk }` so the engine knows which ships remain.
  - The engine rebuilds the heat map from `status` values and remaining boats, so make sure hits/misses/sunk tiles are kept up to date before invoking the bot.
