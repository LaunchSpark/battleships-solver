// packages/battleship-engine/src/index.js

// Re-export public API for the engine.
// This should stay small and stable so apps can rely on it.

export { createEmptyBoard, applyShot, isGameOver, createInitialGameState, TILE_STATUS } from './gameState.js';
export { getBestMove } from './ai/bot.js';
