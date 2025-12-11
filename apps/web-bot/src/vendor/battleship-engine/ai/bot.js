// packages/battleship-engine/src/ai/bot.js

// getBestMove(gameData) is the main entry point for the bot logic.
// It expects a serializable gameData object with:
// {
//   highHeat: number,
//   board: Tile[][] where Tile = { status: 0|1|2|3, heat: number },
//   boats: [{ name, length, sunk }]
// }

const STATUS = {
  UNKNOWN: 0,
  WATER: 1,
  HIT: 2,
  SUNK: 3
};

function buildHeatMap(gameData) {
  const board = Array.isArray(gameData?.board) ? gameData.board : [];
  const rows = board.length;
  const cols = rows > 0 && Array.isArray(board[0]) ? board[0].length : 0;
  const boats = Array.isArray(gameData?.boats) ? gameData.boats : [];

  const hitCells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c]?.status === STATUS.HIT) {
        hitCells.push({ r, c });
      }
    }
  }

  const prob = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  const remainingBoats = boats.filter((boat) => !boat.sunk);

  function inBounds(row, col) {
    return row >= 0 && row < rows && col >= 0 && col < cols;
  }

  function canShipOccupy(row, col) {
    if (!inBounds(row, col)) return false;
    const status = board[row][col]?.status;
    if (status === STATUS.WATER) return false;
    if (status === STATUS.SUNK) return false;
    return true; // UNKNOWN or HIT
  }

  function isValidPlacement(length, startRow, startCol, orientation) {
    for (let offset = 0; offset < length; offset++) {
      let r = startRow;
      let c = startCol;

      if (orientation === 'H') {
        c = startCol + offset;
      } else {
        r = startRow + offset;
      }

      if (!canShipOccupy(r, c)) {
        return false;
      }
    }
    return true;
  }

  for (const boat of remainingBoats) {
    const L = boat.length;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col <= cols - L; col++) {
        if (isValidPlacement(L, row, col, 'H')) {
          for (let offset = 0; offset < L; offset++) {
            prob[row][col + offset] += 1;
          }
        }
      }
    }

    for (let row = 0; row <= rows - L; row++) {
      for (let col = 0; col < cols; col++) {
        if (isValidPlacement(L, row, col, 'V')) {
          for (let offset = 0; offset < L; offset++) {
            prob[row + offset][col] += 1;
          }
        }
      }
    }
  }

  for (const { r, c } of hitCells) {
    if (prob[r][c] === 0) {
      prob[r][c] = 1;
    }
  }

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

  return heat;
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
      if (board[r][c]?.status === STATUS.UNKNOWN) {
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

  const heat = buildHeatMap(gameData);
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

  return {
    row: choice.row,
    col: choice.col,
    reason: `Selected the highest-heat unknown tile (${normalizedScore}) with ${remainingLabel}.`,
    score: normalizedScore
  };
}
