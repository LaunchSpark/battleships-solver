# Battleship Bot Monorepo

This workspace hosts a web-only Battleship Bot. The goal is to provide a responsive browser experience that recommends the next best move in Battleship.

## Structure
- `apps/web-bot`: React web app for desktop and mobile browsers; the only required runtime UI.
- `apps/api`: Optional Node/Express backend for future server-side features.
- `packages/battleship-engine`: Pure JavaScript engine with game rules and bot logic shared across apps.

The web app is intended to build as static assets suitable for GitHub Pages. All core game logic should live in the shared engine.
