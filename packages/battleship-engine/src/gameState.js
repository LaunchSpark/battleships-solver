// packages/battleship-engine/src/gameState.js

// Represent boards as 2D arrays or a flat array with { row, col } objects.
// Keep the state representation simple + serializable.

export function createEmptyBoard(rows = 10, cols = 10) {
  // TODO: return a board data structure compatible with getBestMove.
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      hit: false,
      miss: false,
      ship: false
    }))
  );
}

export function createInitialGameState(options = {}) {
  // TODO: define the shape of gameState (boards, shots, remaining ships, etc.)
  return {
    board: createEmptyBoard(options.rows ?? 10, options.cols ?? 10),
    shots: [],
    // Add other fields as needed
  };
}

export function applyShot(gameState, row, col) {
  // TODO: update gameState with a new shot and return the new state.
  // This must be a pure function or clearly documented if mutating.
  return gameState;
}

export function isGameOver(gameState) {
  // TODO: check if all ships are sunk, etc.
  return false;
}
