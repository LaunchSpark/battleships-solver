# Project Overview

This repository hosts a web-only Battleship Bot. The focus is a responsive React experience that recommends the next best move in Battleship and runs entirely in desktop and mobile browsers.

# Architecture & Modules
- `apps/web-bot`: React web application (required UI). Build static assets suitable for GitHub Pages. Must remain web-only (no React Native) and responsive for mobile/desktop.
- `packages/battleship-engine`: Pure JavaScript engine with all game rules and bot logic. UI-agnostic and environment-agnostic so it can run in both browser and Node contexts.
- `apps/api`: Optional Node/Express backend for future server-side features or heavier computation. The web app should not require this service to function.

# Guidelines for Future AI Agents
- Keep the Battleship engine as the single source of truth for rules and bot intelligence; do not duplicate bot logic in apps.
- Use `getBestMove(gameState)` from `battleship-engine` when recommending moves in any UI or API layer.
- Maintain the web experience as browser-only and responsive. Avoid platform-specific features that break GitHub Pages builds.
- Keep components small and focused (e.g., `BoardView`, `Controls`, `BestMovePanel`) and preserve clear separation between UI and logic.
- If adding backend features, ensure they do not introduce coupling that prevents the web app from running purely in the browser.

# TODO Roadmap
- Implement real Battleship AI (probability / hunt-target) in `getBestMove`.
- Flesh out game state modeling, placement validation, and win detection.
- Add board interaction UI for marking hits/misses and ship placement.
- Set up routing or navigation for the web app as needed.
- Add tests across engine and UI packages.
- Configure bundler/build pipeline and GitHub Pages deployment for `apps/web-bot`.
