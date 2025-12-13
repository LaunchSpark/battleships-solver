// packages/battleship-engine/src/ai/bot.js

import { TILE_STATUS } from "../gameState.js";

function getBoardSize(board) {
  const rows = Array.isArray(board) ? board.length : 0;
  const cols = rows > 0 && Array.isArray(board[0]) ? board[0].length : 0;
  return { rows, cols };
}

function inBounds(board, r, c) {
  const { rows, cols } = getBoardSize(board);
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

function findHitClusters(board) {
  const { rows, cols } = getBoardSize(board);
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const clusters = [];

  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (visited[r][c]) continue;
      if (board[r]?.[c]?.status !== TILE_STATUS.HIT) continue;

      const queue = [{ r, c }];
      visited[r][c] = true;
      const cells = [];

      while (queue.length) {
        const current = queue.shift();
        cells.push(current);

        for (const [dr, dc] of deltas) {
          const nr = current.r + dr;
          const nc = current.c + dc;
          if (!inBounds(board, nr, nc)) continue;
          if (visited[nr][nc]) continue;
          if (board[nr]?.[nc]?.status !== TILE_STATUS.HIT) continue;
          visited[nr][nc] = true;
          queue.push({ r: nr, c: nc });
        }
      }

      clusters.push({ cells });
    }
  }

  return clusters;
}

function canShipOccupy(board, r, c) {
  if (!inBounds(board, r, c)) return false;
  const status = board[r]?.[c]?.status;
  if (status === TILE_STATUS.MISS) return false;
  if (status === TILE_STATUS.SUNK) return false;
  return true;
}

function enumeratePlacementsForLength(board, length) {
  const { rows, cols } = getBoardSize(board);
  const placements = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols - length; c++) {
      const cells = [];
      let valid = true;
      for (let offset = 0; offset < length; offset++) {
        const col = c + offset;
        if (!canShipOccupy(board, r, col)) {
          valid = false;
          break;
        }
        cells.push({ r, c: col });
      }
      if (valid) {
        placements.push({ cells, length, orientation: "H" });
      }
    }
  }

  for (let r = 0; r <= rows - length; r++) {
    for (let c = 0; c < cols; c++) {
      const cells = [];
      let valid = true;
      for (let offset = 0; offset < length; offset++) {
        const row = r + offset;
        if (!canShipOccupy(board, row, c)) {
          valid = false;
          break;
        }
        cells.push({ r: row, c });
      }
      if (valid) {
        placements.push({ cells, length, orientation: "V" });
      }
    }
  }

  return placements;
}

function placementCoversAll(placement, cells) {
  return cells.every((cell) =>
    placement.cells.some((p) => p.r === cell.r && p.c === cell.c)
  );
}

function placementTouchesAny(placement, cells) {
  return cells.some((cell) =>
    placement.cells.some((p) => p.r === cell.r && p.c === cell.c)
  );
}

function placementKey(placement) {
  return placement.cells
    .map((cell) => `${cell.r},${cell.c}`)
    .sort()
    .join("|");
}

function addUniquePlacements(target, additions, seen) {
  additions.forEach((placement) => {
    const key = placementKey(placement);
    if (seen.has(key)) return;
    seen.add(key);
    target.push(placement);
  });
}

function buildPlacementPools(board, shipsRemaining, hitClusters) {
  const baseByLength = new Map();
  let placementsConsidered = 0;

  for (const ship of shipsRemaining) {
    if (baseByLength.has(ship.length)) continue;
    const placements = enumeratePlacementsForLength(board, ship.length);
    baseByLength.set(ship.length, placements);
    placementsConsidered += placements.length;
  }

  const clustersDiagnostics = [];
  const strictPlacements = [];
  const fallbackPlacements = [];
  const strictSeen = new Set();
  const fallbackSeen = new Set();
  const unexplainedHits = [];

  if (hitClusters.length === 0) {
    baseByLength.forEach((placements) => strictPlacements.push(...placements));
    return {
      placementsConsidered,
      placementsForHeat: strictPlacements,
      clustersDiagnostics,
      unexplainedHits
    };
  }

  hitClusters.forEach((cluster, clusterIndex) => {
    let validForCluster = [];
    let fallbackForCluster = [];

    for (const ship of shipsRemaining) {
      const placements = baseByLength.get(ship.length) ?? [];
      const covering = placements.filter((p) => placementCoversAll(p, cluster.cells));
      const touching = placements.filter((p) => placementTouchesAny(p, cluster.cells));
      validForCluster = validForCluster.concat(covering);
      fallbackForCluster = fallbackForCluster.concat(touching);
    }

    if (validForCluster.length === 0) {
      unexplainedHits.push({ clusterIndex, cells: cluster.cells });
      addUniquePlacements(fallbackPlacements, fallbackForCluster, fallbackSeen);
    } else {
      addUniquePlacements(strictPlacements, validForCluster, strictSeen);
    }

    clustersDiagnostics.push({
      cells: cluster.cells,
      validPlacements: validForCluster.length
    });
  });

  const placementsForHeat = strictPlacements.length > 0 ? strictPlacements : fallbackPlacements;

  return {
    placementsConsidered,
    placementsForHeat,
    clustersDiagnostics,
    unexplainedHits
  };
}

function scoreHeat(board, placements, shipsRemaining) {
  const { rows, cols } = getBoardSize(board);
  const rawHeat = Array.from({ length: rows }, () => Array(cols).fill(0));
  const placementsByLength = new Map();

  placements.forEach((placement) => {
    const bucket = placementsByLength.get(placement.length) ?? [];
    bucket.push(placement);
    placementsByLength.set(placement.length, bucket);
  });

  for (const ship of shipsRemaining) {
    const placementsForShip = placementsByLength.get(ship.length) ?? [];
    const contribution = placementsForShip.length > 0 ? 1 / placementsForShip.length : 0;
    for (const placement of placementsForShip) {
      const hitsCovered = placement.cells.filter((cell) => board[cell.r]?.[cell.c]?.status === TILE_STATUS.HIT).length;
      const multiplier = 1 + (hitsCovered > 0 ? hitsCovered / placement.length : 0);
      const weighted = contribution * multiplier;
      placement.cells.forEach(({ r, c }) => {
        rawHeat[r][c] += weighted;
      });
    }
  }

  let maxHeat = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rawHeat[r][c] > maxHeat) maxHeat = rawHeat[r][c];
    }
  }

  const hasAnyPlacement = placements.length > 0 && maxHeat > 0;
  const heatmap = Array.from({ length: rows }, () => Array(cols).fill(0));
  if (!hasAnyPlacement) {
    return { rawHeat, heatmap, rawHeatMax: maxHeat, hasAnyPlacement };
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      heatmap[r][c] = rawHeat[r][c] / maxHeat;
    }
  }

  return { rawHeat, heatmap, rawHeatMax: maxHeat, hasAnyPlacement };
}

function isUnknown(board, r, c) {
  return board[r]?.[c]?.status === TILE_STATUS.UNKNOWN;
}

function selectBestShot(board, heatmap, rawHeat, hitClusters, placementsAvailable) {
  const { rows, cols } = getBoardSize(board);
  const hasHits = hitClusters.length > 0;
  const adjacency = new Set();
  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  if (hasHits && placementsAvailable) {
    hitClusters.forEach((cluster) => {
      cluster.cells.forEach(({ r, c }) => {
        deltas.forEach(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          if (inBounds(board, nr, nc) && isUnknown(board, nr, nc)) {
            adjacency.add(`${nr},${nc}`);
          }
        });
      });
    });
  }

  let best = { row: -1, col: -1, heat: -1, raw: -1 };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isUnknown(board, r, c)) continue;
      if (hasHits && placementsAvailable && adjacency.size > 0 && !adjacency.has(`${r},${c}`)) {
        continue;
      }

      const cellHeat = heatmap?.[r]?.[c] ?? 0;
      const cellRaw = rawHeat?.[r]?.[c] ?? 0;
      if (
        cellHeat > best.heat ||
        (cellHeat === best.heat && cellRaw > best.raw) ||
        (cellHeat === best.heat && cellRaw === best.raw && (best.row === -1 || r < best.row || (r === best.row && c < best.col)))
      ) {
        best = { row: r, col: c, heat: cellHeat, raw: cellRaw };
      }
    }
  }

  return best;
}

export function getBestMove(gameData) {
  const board = Array.isArray(gameData?.board) ? gameData.board : [];
  const boats = Array.isArray(gameData?.boats) ? gameData.boats : [];
  const { rows } = getBoardSize(board);

  if (!rows) {
    return {
      move: { row: -1, col: -1, scoreNormalized: 0, reason: "No board provided in gameData." },
      heatmap: [],
      rawHeat: [],
      flags: { hasAnyPlacement: false },
      diagnostics: {
        mode: "hunt",
        shipsRemaining: [],
        placementsConsidered: 0,
        placementsValid: 0,
        hitClusters: [],
        unexplainedHits: []
      }
    };
  }

  const shipsRemaining = boats.filter((boat) => !boat.sunk && boat.length > 0);
  const hitClusters = findHitClusters(board);
  const mode = hitClusters.length > 0 ? "target" : "hunt";

  const {
    placementsConsidered,
    placementsForHeat,
    clustersDiagnostics,
    unexplainedHits
  } = buildPlacementPools(board, shipsRemaining, hitClusters);

  const { rawHeat, heatmap, rawHeatMax, hasAnyPlacement } = scoreHeat(
    board,
    placementsForHeat,
    shipsRemaining
  );

  const placementValidCount = placementsForHeat.length;
  const placementsAvailable = placementValidCount > 0 && rawHeatMax > 0;
  const choice = selectBestShot(board, heatmap, rawHeat, hitClusters, placementsAvailable);

  const shipsRemainingSummary = shipsRemaining.map((boat) => ({ name: boat.name, length: boat.length }));
  const diagnostics = {
    mode,
    shipsRemaining: shipsRemainingSummary,
    placementsConsidered,
    placementsValid: placementValidCount,
    hitClusters: clustersDiagnostics,
    unexplainedHits
  };

  let reason = "";
  if (choice.row === -1 || choice.col === -1) {
    reason = "No unknown tiles available for targeting.";
  } else {
    reason = `Selected ${mode} mode tile with normalized heat ${heatmap?.[choice.row]?.[choice.col] ?? 0}.`;
  }

  if (unexplainedHits.length > 0) {
    const details = unexplainedHits
      .map(({ cells }) =>
        cells.map((cell) => `[r${cell.r + 1},c${cell.c + 1}]`).join(", ")
      )
      .join("; ");
    reason += ` Unexplained hits present; using relaxed placements for clusters: ${details}.`;
  }

  return {
    move: {
      row: choice.row,
      col: choice.col,
      scoreNormalized: heatmap?.[choice.row]?.[choice.col] ?? 0,
      reason
    },
    heatmap,
    rawHeat,
    flags: { hasAnyPlacement },
    diagnostics
  };
}
