import { getBestMove as engineGetBestMove } from "../vendor/battleship-engine/index.js";

export async function getBestMove(gameState) {
  return engineGetBestMove(gameState);
}
