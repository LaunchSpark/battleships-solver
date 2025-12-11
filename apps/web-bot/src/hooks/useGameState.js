import { useState } from "../vendor/react.js";
import { createInitialGameState } from "../vendor/battleship-engine/index.js";
import { getBestMove } from "../services/botEngineClient.js";

export function useGameState() {
  const [gameState, setGameState] = useState(() => createInitialGameState());
  const [lastSuggestion, setLastSuggestion] = useState(null);

  async function suggestMove() {
    const move = await getBestMove(gameState);
    setLastSuggestion(move);
  }

  return { gameState, setGameState, suggestMove, lastSuggestion };
}
