import fs from "fs";
import path from "path";
import assert from "assert";
import { fileURLToPath } from "url";
import { getBestMove } from "../src/ai/bot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_DIR = path.resolve(__dirname, "../src/ai/__fixtures__");
const U = 0, M = 1, H = 2, S = 3;

function loadFixture(name) {
  const fullPath = path.join(FIXTURE_DIR, name);
  const content = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(content);
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
    assert(result.diagnostics?.localSolve?.used === true, "Local solver should be used.");
    assert(result.diagnostics?.localSolve?.totalSolutions >= 2, "Local solver should find multiple solutions.");
    assert(/entropy|information/i.test(reason), "Reason should mention information gain/entropy.");
  }

  // Fixture 4
  {
    const fixture = loadFixture("fixture_diagonal_hits_contradiction.json");
    const result = getBestMove(fixture);
    assert((result.diagnostics?.unexplainedHits?.length ?? 0) > 0, "Should report unexplained hits.");
    assert(/unexplained|contradiction/i.test(result.move.reason), "Reason should note contradiction.");
  }

  console.log("PASS: no-touch fixtures");
}

run();
