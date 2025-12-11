import { useState } from "react";
import { createInitialGameState } from "battleship-engine";
import { getBestMove } from "../services/botEngineClient.js";

export function useGameState() {
  const [gameState, setGameState] = useState(() =>
    createInitialGameState()
  );
  const [lastSuggestion, setLastSuggestion] = useState(null);

  async function suggestMove() {
    // For now, call the engine directly in the browser.
    const move = await getBestMove(gameState);
    setLastSuggestion(move);
    // Optionally update gameState with a suggested shot preview.
  }

  return { gameState, setGameState, suggestMove, lastSuggestion };
}
