import { getBestMove } from "battleship-engine";
import { buildResponse } from "../services/battleshipService.js";

// TODO: add validation and error handling for incoming game state payloads.
export async function suggestMove(req, res, next) {
  try {
    const move = await getBestMove(req.body.gameState);
    const response = buildResponse(move);
    res.json(response);
  } catch (error) {
    next(error);
  }
}
