// packages/battleship-engine/src/gameState.js

// Represent boards as 2D arrays of tile objects so the bot can process heat maps.
// Keep the state representation simple + serializable.

export function createEmptyBoard(rows = 10, cols = 10) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      status: 0, // 0 = unknown, 1 = miss, 2 = hit, 3 = sunk
      heat: 0 // 0-1 probability scale of a ship being present
    }))
  );
}

export function createInitialGameState(options = {}) {
  return {
    highHeat: 0,
    board: createEmptyBoard(options.rows ?? 10, options.cols ?? 10),
    boats: options.boats ?? [],
    shots: []
  };
}

export function applyShot(gameState, row, col, status = 1) {
  // Update a tile's status while keeping the rest of the gameData shape intact.
  const nextBoard = gameState.board.map((boardRow, rowIndex) =>
    boardRow.map((tile, colIndex) => {
      if (rowIndex === row && colIndex === col) {
        return { ...tile, status };
      }
      return tile;
    })
  );

  const nextHighHeat = Math.max(
    gameState.highHeat ?? 0,
    ...nextBoard.flat().map((tile) => tile.heat ?? 0)
  );

  return {
    ...gameState,
    board: nextBoard,
    highHeat: nextHighHeat
  };
}

export function isGameOver(gameState) {
  // The game is over when all boats are marked sunk.
  return (gameState.boats ?? []).length > 0
    ? (gameState.boats ?? []).every((boat) => boat.sunk)
    : false;
}
