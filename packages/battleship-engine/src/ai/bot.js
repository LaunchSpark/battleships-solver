// packages/battleship-engine/src/ai/bot.js

// getBestMove(gameState) should be the main entry point for the bot logic.
// This is what the web UI and any backend will call.

export function getBestMove(gameState) {
  // TODO: implement an actual strategy:
  //  - simple heuristic / hunt-target mode
  //  - or probability grid based on remaining ship placements

  // For now, return a placeholder structure so UI can be wired up early.
  return {
    row: 0,
    col: 0,
    reason: "Placeholder move from getBestMove. Implement real AI.",
    score: 0
  };
}
