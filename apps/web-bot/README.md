# web-bot

Responsive React web app for the Battleship Bot. Intended to run in desktop and mobile browsers and build as static assets for GitHub Pages.

## Development
- TODO: configure a bundler/dev server (e.g., Vite) for local development.
- Uses the shared `battleship-engine` package for game logic and move suggestions.

## UI data flow
- Ensure the UI passes a `gameData` object directly into `getBestMove(gameData)` with the following shape:
  - `highHeat`: the highest `heat` value present on the board (ties are not important).
  - `board`: a 2D array of tile objects `{ status: 0|1|2|3, heat: number }`, where `status` values map to unknown, miss, hit, and sunk.
  - `boats`: an array of boats `{ name, length, sunk }` so the engine knows which ships remain.
  - The engine rebuilds the heat map from `status` values and remaining boats, so make sure hits/misses/sunk tiles are kept up to date before invoking the bot.
