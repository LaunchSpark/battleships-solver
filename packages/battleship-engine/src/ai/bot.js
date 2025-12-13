// packages/battleship-engine/src/ai/bot.js

import { TILE_STATUS } from "../gameState.js";

// getBestMove(gameData) is the main entry point for the bot logic.
// It expects a serializable gameData object with:
// {
//   highHeat: number,
//   board: Tile[][] where Tile = { status: 0|1|2|3, heat: number },
//   boats: [{ name, length, sunk }]
// }

function buildHeatMap(gameData) {
  const board = Array.isArray(gameData?.board) ? gameData.board : [];
  const rows = board.length;
  const cols = rows > 0 && Array.isArray(board[0]) ? board[0].length : 0;
  const boats = Array.isArray(gameData?.boats) ? gameData.boats : [];

  const hitCells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c]?.status === TILE_STATUS.HIT) {
        hitCells.push({ r, c });
      }
    }
  }

  const prob = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  const remainingBoats = boats.filter((boat) => !boat.sunk && boat.length > 0);

  // Map of hit coverage counts so we can ensure every hit is explained by at least one
  // possible silhouette. This keeps the solver honest about orientation constraints.
  const hitCoverage = hitCells.map(() => 0);

  function inBounds(row, col) {
    return row >= 0 && row < rows && col >= 0 && col < cols;
  }

  function canShipOccupy(row, col) {
    if (!inBounds(row, col)) return false;
    const status = board[row][col]?.status;
    if (status === TILE_STATUS.MISS) return false;
    if (status === TILE_STATUS.SUNK) return false;
    return true; // UNKNOWN or HIT
  }

  function recordPlacement(cells) {
    // Track how many silhouettes could logically include each HIT cell.
    cells.forEach(({ r, c }) => {
      hitCells.forEach((hit, index) => {
        if (hit.r === r && hit.c === c) {
          hitCoverage[index] += 1;
        }
      });
    });
  }

  function isValidPlacement(length, startRow, startCol, orientation) {
    const cells = [];
    for (let offset = 0; offset < length; offset++) {
      let r = startRow;
      let c = startCol;

      if (orientation === 'H') {
        c = startCol + offset;
      } else {
        r = startRow + offset;
      }

      if (!canShipOccupy(r, c)) {
        return null;
      }

      cells.push({ r, c });
    }

    return cells;
  }

  for (const boat of remainingBoats) {
    const L = boat.length;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col <= cols - L; col++) {
        const cells = isValidPlacement(L, row, col, 'H');
        if (cells) {
          recordPlacement(cells);
          cells.forEach(({ r, c }) => {
            prob[r][c] += 1;
          });
        }
      }
    }

    for (let row = 0; row <= rows - L; row++) {
      for (let col = 0; col < cols; col++) {
        const cells = isValidPlacement(L, row, col, 'V');
        if (cells) {
          recordPlacement(cells);
          cells.forEach(({ r, c }) => {
            prob[r][c] += 1;
          });
        }
      }
    }
  }

  // If any HIT cell could not be explained by a valid silhouette, keep it visible in the
  // heat map so the UI and reasoning can flag the inconsistency.
  hitCells.forEach(({ r, c }, index) => {
    if (hitCoverage[index] === 0) {
      prob[r][c] = Math.max(prob[r][c], 1);
    }
  });

  let maxProb = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (prob[r][c] > maxProb) {
        maxProb = prob[r][c];
      }
    }
  }

  const heat = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const normalized = maxProb > 0 ? prob[r][c] / maxProb : 0;
      if (board[r]?.[c]) {
        board[r][c].heat = normalized;
      }
      heat[r][c] = normalized;
    }
  }

  gameData.highHeat = maxProb > 0 ? 1 : 0;

  return { heat, uncoveredHits: hitCells.filter((_, index) => hitCoverage[index] === 0) };
}

function chooseNextShot(gameData, heat) {
  const board = Array.isArray(gameData?.board) ? gameData.board : [];
  const rows = board.length;
  const cols = rows > 0 && Array.isArray(board[0]) ? board[0].length : 0;

  let bestR = -1;
  let bestC = -1;
  let bestScore = -1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c]?.status === TILE_STATUS.UNKNOWN) {
        if (heat?.[r]?.[c] > bestScore) {
          bestScore = heat[r][c];
          bestR = r;
          bestC = c;
        }
      }
    }
  }

  return { row: bestR, col: bestC, heat: bestScore };
}

export function getBestMove(gameData) {
  const board = Array.isArray(gameData?.board) ? gameData.board : [];
  if (!board.length || !Array.isArray(board[0])) {
    return {
      row: -1,
      col: -1,
      reason: 'No board provided in gameData.',
      score: 0
    };
  }

  const { heat, uncoveredHits } = buildHeatMap(gameData);
  const choice = chooseNextShot(gameData, heat);

  const remainingBoats = (gameData?.boats ?? []).filter((boat) => !boat.sunk);
  const remainingLabel = remainingBoats.length > 0
    ? `${remainingBoats.length} boat(s) remaining (${remainingBoats.map((boat) => boat.name).join(', ')})`
    : 'no remaining boats reported';

  if (choice.row === -1 || choice.col === -1) {
    return {
      row: -1,
      col: -1,
      reason: 'No unknown tiles left to target in the provided gameData.',
      score: 0
    };
  }

  const normalizedScore = typeof choice.heat === 'number' && choice.heat >= 0 ? choice.heat : 0;
  const hitCoverageNote = uncoveredHits.length > 0
    ? ` Some hit cells are not covered by any valid silhouette: ${uncoveredHits
      .map((hit) => `[r${hit.r + 1},c${hit.c + 1}]`).join(', ')}. Review recent shots or boat metadata.`
    : '';

  return {
    row: choice.row,
    col: choice.col,
    reason: `Selected the highest-heat unknown tile (${normalizedScore}) with ${remainingLabel}.${hitCoverageNote}`,
    score: normalizedScore
  };
}
