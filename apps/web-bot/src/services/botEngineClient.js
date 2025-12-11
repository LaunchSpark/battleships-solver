// For now, this uses the battleship-engine directly in the browser.
// If a backend API is added later, this file can be refactored to call it instead.

import { getBestMove as engineGetBestMove } from "battleship-engine";

export async function getBestMove(gameState) {
  // In case we add latency / async behavior later, keep this async.
  return engineGetBestMove(gameState);
}
