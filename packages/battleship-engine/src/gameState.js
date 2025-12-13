// packages/battleship-engine/src/gameState.js

// Represent boards as 2D arrays of tile objects so the bot can process heat maps.
// Keep the state representation simple + serializable.

export const TILE_STATUS = {
  UNKNOWN: 0,
  MISS: 1,
  HIT: 2,
  SUNK: 3
};

export function createEmptyBoard(rows = 10, cols = 10) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      status: TILE_STATUS.UNKNOWN
    }))
  );
}

export function createInitialGameState(options = {}) {
  return {
    board: createEmptyBoard(options.rows ?? 10, options.cols ?? 10),
    // Boats are metadata only: { id?, name, length, sunk }
    // Placement happens implicitly inside the solver's silhouette generator.
    boats: options.boats ?? [],
    shots: []
  };
}

export function applyShot(gameState, row, col, status = TILE_STATUS.MISS) {
  // Update a tile's status while keeping the rest of the gameData shape intact.
  const nextBoard = gameState.board.map((boardRow, rowIndex) =>
    boardRow.map((tile, colIndex) => {
      if (rowIndex === row && colIndex === col) {
        return { ...tile, status };
      }
      return tile;
    })
  );

  return {
    ...gameState,
    board: nextBoard
  };
}

export function isGameOver(gameState) {
  // The game is over when all boats are marked sunk.
  return (gameState.boats ?? []).length > 0
    ? (gameState.boats ?? []).every((boat) => boat.sunk)
    : false;
}
