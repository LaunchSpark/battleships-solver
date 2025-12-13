// packages/battleship-engine/src/ai/bot.js

import { TILE_STATUS } from "../gameState.js";

// Local solve limits
export const ROI_MAX_AREA = 36; // e.g., 6x6
export const ROI_PAD = 1; // ROI padding around cluster bbox
export const MAX_SOLVE_NODES = 6000; // backtracking node budget
export const MAX_SOLVE_SOLUTIONS = 200; // optional early stop if too many

// Heat / weighting
export const LENGTH_WEIGHT_EXP = 1.5; // weight ships by L^exp
export const HIT_BONUS = 0.25; // base multiplier for placements that touch hits
export const ALPHA_ENDPOINT = 0.75; // endpoint continuation multiplier in target mode

// Hunt parity
export const ENABLE_PARITY_HUNT = true;

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

function placementTouchesHits(placement, board) {
  return placement.cells.some((cell) => board[cell.r]?.[cell.c]?.status === TILE_STATUS.HIT);
}

function placementCoversAny(placement, targets) {
  if (!targets || targets.length === 0) return false;
  if (targets instanceof Set) {
    return placement.cells.some((cell) => targets.has(key(cell.r, cell.c)));
  }
  return targets.some((cell) => placement.cells.some((p) => p.r === cell.r && p.c === cell.c));
}

function computeClusterEndpoints(cluster, board) {
  const deltas = dirs4();
  const endpoints = [];
  for (const cell of cluster.cells) {
    let hitNeighbors = 0;
    for (const [dr, dc] of deltas) {
      const nr = cell.r + dr;
      const nc = cell.c + dc;
      if (board[nr]?.[nc]?.status === TILE_STATUS.HIT) {
        hitNeighbors += 1;
      }
    }
    if (hitNeighbors <= 1) {
      endpoints.push(cell);
    }
  }
  return endpoints;
}

function computeEndpointAdjacentUnknowns(endpoints, board) {
  const deltas = dirs4();
  const unknowns = new Set();
  for (const cell of endpoints) {
    for (const [dr, dc] of deltas) {
      const nr = cell.r + dr;
      const nc = cell.c + dc;
      if (inBounds(board, nr, nc) && isUnknown(board, nr, nc)) {
        unknowns.add(key(nr, nc));
      }
    }
  }
  return unknowns;
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
  requiredHitCells,
  maxNodes = Infinity,
  maxSolutions = Infinity
}) {
  const shipCountHeat = new Map();
  let totalSolutions = 0;
  let nodesVisited = 0;
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
    if (nodesVisited >= maxNodes || totalSolutions >= maxSolutions) {
      return;
    }
    nodesVisited += 1;
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
      if (nodesVisited >= maxNodes || totalSolutions >= maxSolutions) {
        return;
      }
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

  return { totalSolutions, shipCountHeat, nodesVisited };
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

function runLocalSolvers({ board, hitClusters, boatsRemaining, constraints }) {
  const { rows, cols } = getBoardSize(board);
  const results = new Map();
  const diagnostics = { attempts: 0, usedClusters: [] };
  const maxShipLength = boatsRemaining.reduce((m, boat) => Math.max(m, boat.length ?? 0), 0);

  hitClusters.forEach((cluster, clusterIndex) => {
    let pad = Math.max(ROI_PAD, maxShipLength);
    let roi = roiFromCluster(cluster, rows, cols, pad);
    let area = (roi.r1 - roi.r0 + 1) * (roi.c1 - roi.c0 + 1);
    while (area > ROI_MAX_AREA && pad > ROI_PAD) {
      pad -= 1;
      roi = roiFromCluster(cluster, rows, cols, pad);
      area = (roi.r1 - roi.r0 + 1) * (roi.c1 - roi.c0 + 1);
    }
    if (area > ROI_MAX_AREA) return;
    diagnostics.attempts += 1;

    const requiredHitCells = cluster.cells;
    const { totalSolutions, shipCountHeat, nodesVisited } = solveLocalPacking({
      board,
      roi,
      boatsRemaining,
      constraints,
      requiredHitCells,
      maxNodes: MAX_SOLVE_NODES,
      maxSolutions: MAX_SOLVE_SOLUTIONS
    });

    let probGrid = null;
    if (totalSolutions >= 1) {
      probGrid = localCountsToProbGrid(shipCountHeat, totalSolutions, rows, cols);
      diagnostics.usedClusters.push(clusterIndex);
    }

    results.set(clusterIndex, {
      roi,
      totalSolutions,
      probGrid,
      nodesVisited
    });
  });

  return { results, diagnostics };
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
    const placementPools = new Map();
    strictPlacements.forEach((placement) => {
      const bucket = placementPools.get(placement.length) ?? [];
      bucket.push(placement);
      placementPools.set(placement.length, bucket);
    });
    return {
      placementsConsidered,
      placementsForHeat: strictPlacements,
      placementPools,
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
  const placementPools = new Map();
  placementsForHeat.forEach((placement) => {
    const bucket = placementPools.get(placement.length) ?? [];
    bucket.push(placement);
    placementPools.set(placement.length, bucket);
  });

  return {
    placementsConsidered,
    placementsForHeat,
    placementPools,
    clustersDiagnostics,
    unexplainedHits
  };
}

function scoreHeat({ board, placementPools, boatsRemaining, hitClusters, mode, targetCluster }) {
  const { rows, cols } = getBoardSize(board);
  const rawHeat = Array.from({ length: rows }, () => Array(cols).fill(0));

  const byLength = new Map();
  for (const [length, placements] of placementPools.entries()) {
    byLength.set(length, { placements, count: placements.length });
  }

  const shipWeight = (L) => Math.pow(L, LENGTH_WEIGHT_EXP);

  let endpointUnknowns = null;
  if (mode === "target") {
    const clustersForEndpoints = targetCluster ? [targetCluster] : hitClusters;
    clustersForEndpoints.forEach((cluster) => {
      const endpoints = computeClusterEndpoints(cluster, board);
      const unknowns = computeEndpointAdjacentUnknowns(endpoints, board);
      endpointUnknowns = endpointUnknowns ? new Set([...endpointUnknowns, ...unknowns]) : new Set(unknowns);
    });
  }

  for (const ship of boatsRemaining) {
    const entry = byLength.get(ship.length);
    if (!entry) continue;
    const { placements, count } = entry;
    const base = shipWeight(ship.length) / Math.max(1, count);

    for (const placement of placements) {
      let mult = 1;
      if (placementTouchesHits(placement, board)) {
        mult *= 1 + HIT_BONUS;
      }

      if (mode === "target" && targetCluster && endpointUnknowns) {
        if (placementCoversAny(placement, endpointUnknowns)) {
          mult *= 1 + ALPHA_ENDPOINT;
        }
      }

      const weighted = base * mult;
      placement.cells.forEach(({ r, c }) => {
        rawHeat[r][c] += weighted;
      });
    }
  }

  let minLength = Infinity;
  boatsRemaining.forEach((boat) => {
    minLength = Math.min(minLength, boat.length);
  });

  if (ENABLE_PARITY_HUNT && mode === "hunt" && minLength >= 2) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 1) {
          rawHeat[r][c] = 0;
        }
      }
    }
  }

  let maxHeat = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rawHeat[r][c] > maxHeat) maxHeat = rawHeat[r][c];
    }
  }

  const hasAnyPlacement = placementPools.size > 0 && maxHeat > 0;
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

function listCellsWhere(board, predicate) {
  const { rows, cols } = getBoardSize(board);
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (predicate(board?.[r]?.[c], r, c)) {
        cells.push({ r, c });
      }
    }
  }
  return cells;
}

function selectBestShot({
  board,
  heatmap,
  hitClusters,
  localResultsByCluster,
  diagnostics
}) {
  const { rows, cols } = getBoardSize(board);
  const globalUnknowns = listCellsWhere(
    board,
    (tile) => tile?.status === TILE_STATUS.UNKNOWN
  );

  const bestByHeat = (candidates) => {
    let best = { row: -1, col: -1, score: -1 };
    for (const { r, c } of candidates) {
      const heat = heatmap?.[r]?.[c] ?? 0;
      if (
        heat > best.score ||
        (heat === best.score &&
          (best.row === -1 || r < best.row || (r === best.row && c < best.col)))
      ) {
        best = { row: r, col: c, score: heat };
      }
    }
    return best;
  };

  const mode = hitClusters.length > 0 ? "target" : "hunt";

  if (mode === "hunt") {
    const best = bestByHeat(globalUnknowns);
    diagnostics.selection = { type: "hunt-heat" };
    return { ...best, why: "global heat", clusterIndex: null, selectionType: "hunt" };
  }

  const clusterPromises = hitClusters.map((cluster, index) => {
    const adjSet = new Set();
    cluster.cells.forEach(({ r, c }) => {
      dirs4().forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(board, nr, nc) && isUnknown(board, nr, nc)) {
          adjSet.add(key(nr, nc));
        }
      });
    });

    const adjacentUnknowns = Array.from(adjSet)
      .map((k) => {
        const [r, c] = k.split(",").map(Number);
        return { r, c };
      })
      .sort((a, b) => (a.r === b.r ? a.c - b.c : a.r - b.r));
    const adjHeatValues = adjacentUnknowns.map(({ r, c }) => heatmap?.[r]?.[c] ?? 0);
    const maxAdjHeat = adjHeatValues.length > 0 ? Math.max(...adjHeatValues) : 0;
    const endpointAdjSet = computeEndpointAdjacentUnknowns(
      computeClusterEndpoints(cluster, board),
      board
    );

    const local = localResultsByCluster?.get(index);
    let bestEntropyCell = null;
    let bestEntropyValue = -1;
    let deterministicCell = null;
    if (local?.probGrid) {
      const { roi } = local;
      const r0 = roi?.r0 ?? 0;
      const r1 = roi?.r1 ?? rows - 1;
      const c0 = roi?.c0 ?? 0;
      const c1 = roi?.c1 ?? cols - 1;
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          if (!isUnknown(board, r, c)) continue;
          const p = local.probGrid?.[r]?.[c] ?? 0;
          if (p === 1) {
            if (
              !deterministicCell ||
              r < deterministicCell.r ||
              (r === deterministicCell.r && c < deterministicCell.c)
            ) {
              deterministicCell = { r, c };
            }
          }
          if (local.totalSolutions >= 2) {
            const ent = entropy01(p);
            if (
              ent > bestEntropyValue ||
              (ent === bestEntropyValue &&
                bestEntropyCell &&
                p > (local.probGrid?.[bestEntropyCell.r]?.[bestEntropyCell.c] ?? -1)) ||
              (ent === bestEntropyValue &&
                (!bestEntropyCell ||
                  (endpointAdjSet?.has(key(r, c)) && !endpointAdjSet?.has(key(bestEntropyCell.r, bestEntropyCell.c))) ||
                  r < bestEntropyCell.r ||
                  (r === bestEntropyCell.r && c < bestEntropyCell.c)))
            ) {
              bestEntropyValue = ent;
              bestEntropyCell = { r, c };
            }
          }
        }
      }
    }

    return {
      index,
      cluster,
      adjacentUnknowns,
      maxAdjHeat,
      local,
      endpointAdjSet,
      bestEntropyCell,
      bestEntropyValue,
      deterministicCell
    };
  });

  let chosen = null;
  let selectionType = "";

  for (const promise of clusterPromises) {
    if (promise.local?.totalSolutions === 1 && promise.deterministicCell) {
      if (
        !chosen ||
        promise.deterministicCell.r < chosen.cell.r ||
        (promise.deterministicCell.r === chosen.cell.r &&
          promise.deterministicCell.c < chosen.cell.c)
      ) {
        chosen = { ...promise, cell: promise.deterministicCell };
        selectionType = "local deterministic";
      }
    }
  }

  if (!chosen) {
    let bestEntropyScore = -1;
    let bestEntropySolutions = Infinity;
    for (const promise of clusterPromises) {
      if (!promise.local || promise.local.totalSolutions < 2) continue;
      if (!promise.bestEntropyCell) continue;
      const entropyScore =
        promise.bestEntropyValue / Math.max(1, Math.sqrt(promise.local.totalSolutions));
      if (
        entropyScore > bestEntropyScore ||
        (entropyScore === bestEntropyScore &&
          promise.local.totalSolutions < bestEntropySolutions) ||
        (entropyScore === bestEntropyScore &&
          promise.local.totalSolutions === bestEntropySolutions &&
          chosen &&
          promise.bestEntropyCell &&
          (promise.bestEntropyCell.r < chosen.cell.r ||
            (promise.bestEntropyCell.r === chosen.cell.r && promise.bestEntropyCell.c < chosen.cell.c)))
      ) {
        bestEntropyScore = entropyScore;
        bestEntropySolutions = promise.local.totalSolutions;
        chosen = { ...promise, cell: promise.bestEntropyCell };
        selectionType = "local entropy";
      }
    }
  }

  if (!chosen) {
    let bestAdj = -1;
    for (const promise of clusterPromises) {
      if (promise.maxAdjHeat <= 0) continue;
      if (promise.maxAdjHeat > bestAdj || (promise.maxAdjHeat === bestAdj && promise.index < (chosen?.index ?? Infinity))) {
        const adjBest = bestByHeat(promise.adjacentUnknowns);
        chosen = { ...promise, cell: { r: adjBest.row, c: adjBest.col }, heatScore: adjBest.score };
        bestAdj = promise.maxAdjHeat;
        selectionType = "adjacent heat";
      }
    }
  }

  if (!chosen) {
    const best = bestByHeat(globalUnknowns);
    diagnostics.selection = { type: "global-fallback", clusterIndex: null };
    return {
      row: best.row,
      col: best.col,
      score: best.score,
      why: "global fallback",
      clusterIndex: null,
      selectionType: "global"
    };
  }

  diagnostics.selection = {
    type: selectionType,
    clusterIndex: chosen.index,
    clusterSize: chosen.cluster.cells.length,
    localSolutions: chosen.local?.totalSolutions,
    maxAdjHeat: chosen.maxAdjHeat
  };

  const useAdjacency = chosen.maxAdjHeat > 0 && selectionType === "adjacent heat";
  if (useAdjacency) {
    return {
      row: chosen.cell.r,
      col: chosen.cell.c,
      score: chosen.heatScore ?? (heatmap?.[chosen.cell.r]?.[chosen.cell.c] ?? 0),
      why: "adjacent heat",
      clusterIndex: chosen.index,
      selectionType
    };
  }

  return {
    row: chosen.cell.r,
    col: chosen.cell.c,
    score:
      selectionType === "local deterministic"
        ? 1
        : selectionType === "local entropy"
          ? chosen.local?.probGrid?.[chosen.cell.r]?.[chosen.cell.c] ?? 0
          : heatmap?.[chosen.cell.r]?.[chosen.cell.c] ?? 0,
    why: selectionType,
    clusterIndex: chosen.index,
    selectionType
  };
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
    placementPools,
    clustersDiagnostics,
    unexplainedHits
  } = buildPlacementPools(board, shipsRemaining, hitClusters, constraints);

  const { rawHeat, heatmap, rawHeatMax, hasAnyPlacement } = scoreHeat({
    board,
    placementPools,
    boatsRemaining: shipsRemaining,
    hitClusters,
    mode,
    targetCluster: null
  });

  const placementValidCount = placementsForHeat.length;

  let localResultsByCluster = new Map();
  let localSolveDiagnostics = { attempts: 0, usedClusters: [], perCluster: [] };

  if (hitClusters.length > 0) {
    const { results, diagnostics: localDiagnostics } = runLocalSolvers({
      board,
      hitClusters,
      boatsRemaining: shipsRemaining,
      constraints
    });
    localResultsByCluster = results;
    localSolveDiagnostics = {
      attempts: localDiagnostics.attempts,
      usedClusters: localDiagnostics.usedClusters,
      perCluster: Array.from(results.entries()).map(([clusterIndex, value]) => ({
        clusterIndex,
        totalSolutions: value.totalSolutions,
        nodesVisited: value.nodesVisited,
        roi: value.roi
      }))
    };
  }

  const selectionDiagnostics = {};
  const choice = selectBestShot({
    board,
    heatmap,
    hitClusters,
    localResultsByCluster,
    diagnostics: selectionDiagnostics
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
    localSolve: localSolveDiagnostics,
    selection: selectionDiagnostics.selection
  };

  let reason = "";
  if (choice.row === -1 || choice.col === -1) {
    reason = "No unknown tiles available for targeting.";
  } else {
    const baseScore = choice.score ?? 0;
    const parts = [
      `Selected ${mode} mode tile`,
      selectionDiagnostics.selection?.type ? `via ${selectionDiagnostics.selection.type}` : null,
      choice.clusterIndex !== null && choice.clusterIndex !== undefined
        ? `on cluster ${choice.clusterIndex}`
        : null,
      `with score ${baseScore.toFixed(3)}.`
    ].filter(Boolean);
    reason = `${parts.join(" ")} No-touch rule active.`;
    if (selectionDiagnostics.selection?.clusterSize) {
      reason += ` Cluster size ${selectionDiagnostics.selection.clusterSize}.`;
    }
  }

  if (unexplainedHits.length > 0) {
    const details = unexplainedHits
      .map(({ cells }) =>
        cells.map((cell) => `[r${cell.r + 1},c${cell.c + 1}]`).join(", ")
      )
      .join("; ");
    reason += ` Unexplained hits present; using relaxed placements for clusters: ${details}.`;
  }

  if (localSolveDiagnostics.attempts > 0) {
    reason += ` Local exact solve attempted on ${localSolveDiagnostics.attempts} cluster(s); usable results for ${localSolveDiagnostics.usedClusters.length}.`;
  }

  return {
    move: {
      row: choice.row,
      col: choice.col,
      scoreNormalized: choice.score ?? 0,
      reason
    },
    heatmap,
    rawHeat,
    flags: { hasAnyPlacement },
    diagnostics
  };
}
