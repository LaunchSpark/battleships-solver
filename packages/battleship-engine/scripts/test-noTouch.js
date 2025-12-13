import fs from "fs";
import path from "path";
import assert from "assert";
import { fileURLToPath } from "url";
import { getBestMove } from "../src/ai/bot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_DIR = path.resolve(__dirname, "../src/ai/__fixtures__");
const PERF_DIR = path.resolve(FIXTURE_DIR, "perf_no_touch");
const U = 0, M = 1, H = 2, S = 3;

function loadFixture(name) {
  const fullPath = path.join(FIXTURE_DIR, name);
  const content = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(content);
}

function loadPerfFixture(name) {
  const fullPath = path.join(PERF_DIR, name);
  const content = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(content);
}

function assertUnknown(board, r, c, message) {
  assert(board?.[r]?.[c]?.status === U, message ?? `Expected UNKNOWN at (${r},${c}).`);
}

function isAdjacentTo(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

function run() {
  // Fixture 1
  {
    const fixture = loadFixture("fixture_no_touch_basic.json");
    const result = getBestMove(fixture);
    const { row, col } = result.move;
    const orthogonal = [
      [2, 1],
      [2, 3],
      [1, 2],
      [3, 2]
    ];
    assert(
      orthogonal.some(([r, c]) => r === row && c === col),
      "Best move should target orthogonal neighbor under no-touch."
    );
    assert(result.diagnostics?.rules?.noTouch === true, "No-touch rule flag missing.");
  }

  // Fixture 2
  {
    const fixture = loadFixture("fixture_sunk_halo.json");
    const result = getBestMove(fixture);
    const heat = result.heatmap;
    const haloCells = [
      [1, 0], [1, 1], [1, 2], [1, 3],
      [2, 0], [2, 4],
      [3, 1], [3, 2], [3, 3]
    ];
    haloCells.forEach(([r, c]) => {
      assert(heat?.[r]?.[c] === 0, `Halo cell (${r},${c}) should have zero heat.`);
    });
    assert(result.diagnostics?.placementsValid > 0, "Placements should remain available away from sunk halo.");
  }

  // Fixture 3
  {
    const fixture = loadFixture("fixture_two_by_four_two_L2.json");
    const result = getBestMove(fixture);
    const { row, col, reason } = result.move;
    assert(row >= 2 && row <= 3 && col >= 1 && col <= 4, "Move should be inside ROI.");
    const localInfo = result.diagnostics?.localSolve?.perCluster?.find((c) => c.clusterIndex === 0);
    assert(localInfo && localInfo.totalSolutions >= 2, "Local solver should find multiple solutions.");
    const selType = result.diagnostics?.selection?.type;
    assert(
      /entropy|information/i.test(reason) || selType === "local entropy" || selType === "local deterministic",
      "Local solver-driven choice should be explained."
    );
  }

  // Fixture 4
  {
    const fixture = loadFixture("fixture_diagonal_hits_contradiction.json");
    const result = getBestMove(fixture);
    assert((result.diagnostics?.unexplainedHits?.length ?? 0) > 0, "Should report unexplained hits.");
    assert(/unexplained|contradiction/i.test(result.move.reason), "Reason should note contradiction.");
  }

  // Parity hunt fixture
  {
    const fixture = loadPerfFixture("01_parity_hunt_min2.json");
    const result = getBestMove(fixture);
    const { row, col } = result.move;
    assert(result.diagnostics?.mode === "hunt", "Should be in hunt mode.");
    assertUnknown(fixture.board, row, col, "Move must target unknown tile.");
    assert((row + col) % 2 === 0, "Parity hunt should pick even parity when length >=2.");
    for (let r = 0; r < fixture.board.length; r++) {
      for (let c = 0; c < fixture.board[0].length; c++) {
        if ((r + c) % 2 === 1) {
          assert(result.heatmap?.[r]?.[c] === 0, "Odd parity cells should be zeroed in hunt.");
        }
      }
    }
  }

  // Length weighting corridor
  {
    const fixture = loadPerfFixture("02_length_weight_corridor.json");
    const result = getBestMove(fixture);
    const { row, col } = result.move;
    assert(col === 3, "Length-weighted heat should prioritize the corridor column (c=3).");
    const corridorHeat = result.heatmap[row][col];
    const patchHeat = result.heatmap[0][0];
    assert(corridorHeat > patchHeat, "Corridor heat should exceed small patch heat, reflecting length weighting.");
  }

  // Adjacent deadzone fallback
  {
    const fixture = loadPerfFixture("03_target_adjacent_deadzone_fallback.json");
    const result = getBestMove(fixture);
    const { row, col } = result.move;
    assert(result.diagnostics?.mode === "target", "Should be in target mode.");
    assert(!isAdjacentTo(row, col, 2, 2), "Move should fall back outside adjacent deadzone.");
    assert(result.diagnostics?.selection?.type === "global-fallback", "Selection should record global fallback.");
  }

  // Endpoint bonus prefers continuation
  {
    const fixture = loadPerfFixture("04_endpoint_bonus_line_hits.json");
    const result = getBestMove(fixture);
    const { row, col } = result.move;
    assert(
      (row === 3 && col === 2) || (row === 3 && col === 5),
      "Endpoint bonus should prefer extending the hit line."
    );
  }

  // Two clusters choose promising
  {
    const fixture = loadPerfFixture("05_two_hit_clusters_choose_promising.json");
    const result = getBestMove(fixture);
    assert(result.diagnostics?.mode === "target", "Should be in target mode for clusters.");
    assert(result.diagnostics?.selection?.clusterIndex === 0, "Should prioritize constrained cluster (index 0).");
  }

  // Local entropy with two solutions
  {
    const fixture = loadPerfFixture("06_local_entropy_two_solutions.json");
    const result = getBestMove(fixture);
    const { row, col, reason } = result.move;
    const localInfo = result.diagnostics?.localSolve?.perCluster?.find((c) => c.clusterIndex === 0);
    assert(localInfo && localInfo.totalSolutions >= 2, "Local solver should find >=2 solutions.");
    const roi = localInfo.roi;
    assert(row >= roi.r0 && row <= roi.r1 && col >= roi.c0 && col <= roi.c1, "Move should be inside local ROI.");
    assert(/entropy|information/i.test(reason) || result.diagnostics?.selection?.type === "local entropy", "Should select by entropy when multiple solutions exist.");
  }

  // Local unique solution still used
  {
    const fixture = loadPerfFixture("07_local_unique_solution_used.json");
    const result = getBestMove(fixture);
    const localInfo = result.diagnostics?.localSolve?.perCluster?.find((c) => c.clusterIndex === 0);
    assert(localInfo && localInfo.totalSolutions === 1, "Local solver should find unique solution.");
    assert(
      result.diagnostics?.selection?.type === "local deterministic",
      "Deterministic local solution should drive selection."
    );
    assert(Math.abs(result.move.scoreNormalized - 1) < 1e-9, "Selected move should have probability 1.");
  }

  // Multiple clusters local solver attempts
  {
    const fixture = loadPerfFixture("08_local_solver_multiple_clusters.json");
    const result = getBestMove(fixture);
    assert((result.diagnostics?.localSolve?.attempts ?? 0) >= 2, "Should attempt local solve for multiple clusters.");
    assert(result.diagnostics?.selection?.type, "Selection should include reason/type.");
  }

  console.log("PASS: no-touch fixtures");
}

run();
