// packages/battleship-engine/src/ai/bot.js

import { TILE_STATUS } from "../gameState.js";

/**
 * Convert (r,c) into stable string key for Set/Map.
 * @param {number} r
 * @param {number} c
 * @returns {string}
 */
function key(r, c) {
  return `${r},${c}`;
}

/**
 * 4-neighbor deltas.
 * @returns {Array<[number, number]>}
 */
function dirs4() {
  return [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];
}

/**
 * 8-neighbor deltas (includes diagonals).
 * @returns {Array<[number, number]>}
 */
function dirs8() {
  return [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
  ];
}

function getBoardSize(board) {
  const rows = Array.isArray(board) ? board.length : 0;
  const cols = rows > 0 && Array.isArray(board[0]) ? board[0].length : 0;
  return { rows, cols };
}

function inBounds(board, r, c) {
  const { rows, cols } = getBoardSize(board);
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

/**
 * Build derived constraint sets for fast checks.
 * @param {Array<Array<{status:number}>>} board
 * @returns {{
 *   rows: number,
 *   cols: number,
 *   blocked: Set<string>,
 *   shipKnown: Set<string>,
 * }}
 */
function buildConstraints(board) {
  const { rows, cols } = getBoardSize(board);
  const blocked = new Set();
  const shipKnown = new Set();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const status = board?.[r]?.[c]?.status;
      if (status === TILE_STATUS.MISS || status === TILE_STATUS.SUNK) {
        blocked.add(key(r, c));
      }
      if (status === TILE_STATUS.HIT || status === TILE_STATUS.SUNK) {
        shipKnown.add(key(r, c));
      }
    }
  }

  return { rows, cols, blocked, shipKnown };
}

function findHitClusters(board) {
  const { rows, cols } = getBoardSize(board);
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const clusters = [];

  const deltas = dirs4();

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

/**
 * Enumerate all placements of a given length on a rows x cols board.
 * Must be deterministic order.
 * @param {number} length
 * @param {number} rows
 * @param {number} cols
 * @returns {Placement[]}
 */
function enumeratePlacementsForLength(length, rows, cols) {
  const placements = [];
  const neighborDeltas = dirs8();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols - length; c++) {
      const cells = [];
      for (let offset = 0; offset < length; offset++) {
        cells.push({ r, c: c + offset });
      }
      const haloSet = new Set();
      for (const cell of cells) {
        for (const [dr, dc] of neighborDeltas) {
          const nr = cell.r + dr;
          const nc = cell.c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          const k = key(nr, nc);
          haloSet.add(k);
        }
      }
      cells.forEach(({ r: cr, c: cc }) => haloSet.delete(key(cr, cc)));
      const haloCells = Array.from(haloSet)
        .map((k) => {
          const [hr, hc] = k.split(",").map(Number);
          return { r: hr, c: hc };
        })
        .sort((a, b) => (a.r === b.r ? a.c - b.c : a.r - b.r));
      placements.push({ cells, haloCells, length, orientation: "H" });
    }
  }

  for (let r = 0; r <= rows - length; r++) {
    for (let c = 0; c < cols; c++) {
      const cells = [];
      for (let offset = 0; offset < length; offset++) {
        cells.push({ r: r + offset, c });
      }
      const haloSet = new Set();
      for (const cell of cells) {
        for (const [dr, dc] of neighborDeltas) {
          const nr = cell.r + dr;
          const nc = cell.c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          const k = key(nr, nc);
          haloSet.add(k);
        }
      }
      cells.forEach(({ r: cr, c: cc }) => haloSet.delete(key(cr, cc)));
      const haloCells = Array.from(haloSet)
        .map((k) => {
          const [hr, hc] = k.split(",").map(Number);
          return { r: hr, c: hc };
        })
        .sort((a, b) => (a.r === b.r ? a.c - b.c : a.r - b.r));
      placements.push({ cells, haloCells, length, orientation: "V" });
    }
  }

  return placements;
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

/**
 * Validate a placement under classic blockers + no-touch halo rule.
 * - Hull must not overlap blocked (MISS/SUNK).
 * - Halo must not touch any known-ship cell (HIT/SUNK) that isn't in the hull.
 * @param {Placement} placement
 * @param {{blocked:Set<string>, shipKnown:Set<string>}} constraints
 * @returns {boolean}
 */
function isPlacementValidNoTouch(placement, constraints) {
  const hullKeys = new Set(placement.cells.map((cell) => key(cell.r, cell.c)));
  for (const hKey of hullKeys) {
    if (constraints.blocked.has(hKey)) return false;
  }

  for (const halo of placement.haloCells ?? []) {
    const hKey = key(halo.r, halo.c);
    if (constraints.shipKnown.has(hKey) && !hullKeys.has(hKey)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if placement covers every cell in a cluster.
 * @param {Placement} placement
 * @param {{cells: Cell[]}} cluster
 * @returns {boolean}
 */
function placementCoversCluster(placement, cluster) {
  return cluster.cells.every((cell) =>
    placement.cells.some((p) => p.r === cell.r && p.c === cell.c)
  );
}

/**
 * Compute bounding box around a cluster and expand it.
 * @param {{cells: Cell[]}} cluster
 * @param {number} rows
 * @param {number} cols
 * @param {number} pad
 * @returns {{r0:number,r1:number,c0:number,c1:number}}
 */
function roiFromCluster(cluster, rows, cols, pad) {
  let r0 = rows;
  let r1 = -1;
  let c0 = cols;
  let c1 = -1;
  cluster.cells.forEach(({ r, c }) => {
    r0 = Math.min(r0, r);
    r1 = Math.max(r1, r);
    c0 = Math.min(c0, c);
    c1 = Math.max(c1, c);
  });
  r0 = Math.max(0, r0 - pad);
  c0 = Math.max(0, c0 - pad);
  r1 = Math.min(rows - 1, r1 + pad);
  c1 = Math.min(cols - 1, c1 + pad);
  return { r0, r1, c0, c1 };
}

/**
 * Backtracking exact solver inside ROI.
 */
function solveLocalPacking({
  board,
  roi,
  boatsRemaining,
  constraints,
  requiredHitCells
}) {
  const shipCountHeat = new Map();
  let totalSolutions = 0;
  const { rows, cols } = getBoardSize(board);

  const roiFilter = (cell) =>
    cell.r >= roi.r0 && cell.r <= roi.r1 && cell.c >= roi.c0 && cell.c <= roi.c1;

  const boatsSorted = [...boatsRemaining];
  const placementOptions = new Map();

  for (const boat of boatsSorted) {
    const placements = enumeratePlacementsForLength(boat.length, rows, cols)
      .filter((p) => p.cells.every(roiFilter))
      .filter((p) => isPlacementValidNoTouch(p, constraints));
    placementOptions.set(boat.id ?? boat.name ?? boat.length, placements);
  }

  boatsSorted.sort(
    (a, b) =>
      (placementOptions.get(a.id ?? a.name ?? a.length)?.length ?? 0) -
      (placementOptions.get(b.id ?? b.name ?? b.length)?.length ?? 0)
  );

  const requiredKeys = requiredHitCells.map((cell) => key(cell.r, cell.c));
  const occupiedHull = new Set();
  const occupiedHalo = new Set();

  function backtrack(index) {
    if (index === boatsSorted.length) {
      const coversAllHits = requiredKeys.every((k) => occupiedHull.has(k));
      if (!coversAllHits) return;
      totalSolutions += 1;
      occupiedHull.forEach((k) => {
        shipCountHeat.set(k, (shipCountHeat.get(k) ?? 0) + 1);
      });
      return;
    }

    const boat = boatsSorted[index];
    const options = placementOptions.get(boat.id ?? boat.name ?? boat.length) ?? [];
    for (const placement of options) {
      let blocked = false;
      const hullKeys = placement.cells.map((cell) => key(cell.r, cell.c));
      for (const hk of hullKeys) {
        if (occupiedHull.has(hk) || occupiedHalo.has(hk)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      for (const halo of placement.haloCells ?? []) {
        const hk = key(halo.r, halo.c);
        if (occupiedHull.has(hk)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      hullKeys.forEach((hk) => occupiedHull.add(hk));
      (placement.haloCells ?? []).forEach((halo) => occupiedHalo.add(key(halo.r, halo.c)));

      backtrack(index + 1);

      hullKeys.forEach((hk) => occupiedHull.delete(hk));
      (placement.haloCells ?? []).forEach((halo) => occupiedHalo.delete(key(halo.r, halo.c)));
    }
  }

  backtrack(0);

  return { totalSolutions, shipCountHeat };
}

function localCountsToProbGrid(shipCountHeat, totalSolutions, rows, cols) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  if (totalSolutions === 0) return grid;
  shipCountHeat.forEach((count, k) => {
    const [r, c] = k.split(",").map(Number);
    grid[r][c] = count / totalSolutions;
  });
  return grid;
}

function entropy01(p) {
  if (p <= 0 || p >= 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}

function addUniquePlacements(target, additions, seen) {
  additions.forEach((placement) => {
    const k = placementKey(placement);
    if (seen.has(k)) return;
    seen.add(k);
    target.push(placement);
  });
}

function buildPlacementPools(board, shipsRemaining, hitClusters, constraints) {
  const baseByLength = new Map();
  let placementsConsidered = 0;

  for (const ship of shipsRemaining) {
    if (baseByLength.has(ship.length)) continue;
    const placements = enumeratePlacementsForLength(
      ship.length,
      constraints.rows,
      constraints.cols
    ).filter((p) => isPlacementValidNoTouch(p, constraints));
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
      const covering = placements.filter((p) => placementCoversCluster(p, cluster));
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

function selectBestShot({
  board,
  heatmap,
  hitClusters,
  localProbGrid,
  localRoi
}) {
  const { rows, cols } = getBoardSize(board);
  const hasHits = hitClusters.length > 0;
  const adjacency = new Set();

  if (!localProbGrid) {
    hitClusters.forEach((cluster) => {
      cluster.cells.forEach(({ r, c }) => {
        dirs4().forEach(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          if (inBounds(board, nr, nc) && isUnknown(board, nr, nc)) {
            adjacency.add(key(nr, nc));
          }
        });
      });
    });
  }

  let best = { row: -1, col: -1, score: -1, why: "" };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isUnknown(board, r, c)) continue;

      if (localProbGrid && localRoi) {
        if (r < localRoi.r0 || r > localRoi.r1 || c < localRoi.c0 || c > localRoi.c1) {
          continue;
        }
        const p = localProbGrid?.[r]?.[c] ?? 0;
        const ent = entropy01(p);
        if (
          ent > best.score ||
          (ent === best.score && p > (localProbGrid?.[best.row]?.[best.col] ?? -1)) ||
          (ent === best.score && p === (localProbGrid?.[best.row]?.[best.col] ?? -1) &&
            (best.row === -1 || r < best.row || (r === best.row && c < best.col)))
        ) {
          best = { row: r, col: c, score: ent, why: "local-entropy" };
        }
      } else {
        if (hasHits && adjacency.size > 0 && !adjacency.has(key(r, c))) {
          continue;
        }
        const cellHeat = heatmap?.[r]?.[c] ?? 0;
        const cellRaw = heatmap?.[r]?.[c] ?? 0;
        if (
          cellHeat > best.score ||
          (cellHeat === best.score && cellRaw > (heatmap?.[best.row]?.[best.col] ?? -1)) ||
          (cellHeat === best.score && cellRaw === (heatmap?.[best.row]?.[best.col] ?? -1) &&
            (best.row === -1 || r < best.row || (r === best.row && c < best.col)))
        ) {
          best = { row: r, col: c, score: cellHeat, why: hasHits ? "adjacent-heat" : "heat" };
        }
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

  const constraints = buildConstraints(board);

  const {
    placementsConsidered,
    placementsForHeat,
    clustersDiagnostics,
    unexplainedHits
  } = buildPlacementPools(board, shipsRemaining, hitClusters, constraints);

  const { rawHeat, heatmap, rawHeatMax, hasAnyPlacement } = scoreHeat(
    board,
    placementsForHeat,
    shipsRemaining
  );

  const placementValidCount = placementsForHeat.length;

  let localProbGrid = null;
  let localRoi = null;
  let localSolveDiagnostics = { used: false };

  if (hitClusters.length > 0) {
    const primaryCluster = hitClusters[0];
    const roi = roiFromCluster(primaryCluster, constraints.rows, constraints.cols, 2);
    const area = (roi.r1 - roi.r0 + 1) * (roi.c1 - roi.c0 + 1);
    if (area <= 36 && shipsRemaining.length <= 5) {
      const requiredHits = [];
      for (let r = roi.r0; r <= roi.r1; r++) {
        for (let c = roi.c0; c <= roi.c1; c++) {
          if (board[r]?.[c]?.status === TILE_STATUS.HIT) {
            requiredHits.push({ r, c });
          }
        }
      }

      const { totalSolutions, shipCountHeat } = solveLocalPacking({
        board,
        roi,
        boatsRemaining: shipsRemaining,
        constraints,
        requiredHitCells: requiredHits
      });

      if (totalSolutions >= 1) {
        localProbGrid = localCountsToProbGrid(
          shipCountHeat,
          totalSolutions,
          constraints.rows,
          constraints.cols
        );
        localRoi = roi;
      }

      localSolveDiagnostics = {
        used: totalSolutions >= 2,
        roi,
        totalSolutions
      };

      if (totalSolutions < 2) {
        localProbGrid = null;
        localRoi = null;
      }
    }
  }

  const choice = selectBestShot({
    board,
    heatmap,
    hitClusters,
    localProbGrid,
    localRoi
  });

  const shipsRemainingSummary = shipsRemaining.map((boat) => ({ name: boat.name, length: boat.length }));
  const diagnostics = {
    mode,
    shipsRemaining: shipsRemainingSummary,
    placementsConsidered,
    placementsValid: placementValidCount,
    hitClusters: clustersDiagnostics,
    unexplainedHits,
    rules: { noTouch: true },
    localSolve: localSolveDiagnostics
  };

  let reason = "";
  if (choice.row === -1 || choice.col === -1) {
    reason = "No unknown tiles available for targeting.";
  } else {
    const baseScore =
      localProbGrid && choice.row >= 0 && choice.col >= 0
        ? localProbGrid?.[choice.row]?.[choice.col] ?? 0
        : heatmap?.[choice.row]?.[choice.col] ?? 0;
    reason = `Selected ${mode} mode tile with score ${baseScore.toFixed(3)} using ${choice.why}. No-touch rule active.`;
  }

  if (unexplainedHits.length > 0) {
    const details = unexplainedHits
      .map(({ cells }) =>
        cells.map((cell) => `[r${cell.r + 1},c${cell.c + 1}]`).join(", ")
      )
      .join("; ");
    reason += ` Unexplained hits present; using relaxed placements for clusters: ${details}.`;
  }

  if (localSolveDiagnostics.used) {
    reason += ` Local exact solve found ${localSolveDiagnostics.totalSolutions} solutions; maximizing information gain within ROI.`;
  }

  return {
    move: {
      row: choice.row,
      col: choice.col,
      scoreNormalized:
        (localProbGrid && choice.row >= 0 && choice.col >= 0
          ? localProbGrid?.[choice.row]?.[choice.col]
          : heatmap?.[choice.row]?.[choice.col]) ?? 0,
      reason
    },
    heatmap,
    rawHeat,
    flags: { hasAnyPlacement },
    diagnostics
  };
}
