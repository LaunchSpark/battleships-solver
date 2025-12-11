# battleship-engine

Pure JavaScript Battleship engine containing game rules and bot AI. Designed to run in both browsers and Node without relying on environment-specific globals.

## Game State
Use `createInitialGameState(options)` to initialize a simple game state structure. Boards should remain serializable and easy to manipulate.

## API Surface
- `createEmptyBoard(rows, cols)`
- `createInitialGameState(options)`
- `applyShot(gameState, row, col)`
- `isGameOver(gameState)`
- `getBestMove(gameState)`

All higher-level apps should call `getBestMove(gameState)` rather than reimplementing bot logic.
