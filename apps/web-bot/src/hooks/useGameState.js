import { useRef, useState } from "react";
import { createInitialGameState } from "battleship-engine";
import { getBestMove } from "../services/botEngineClient.js";

function cloneGameStateSnapshot(state) {
  return {
    highHeat: state?.highHeat ?? 0,
    board: (state?.board ?? []).map((row) => row.map((cell) => ({ ...cell }))),
    boats: (state?.boats ?? []).map((boat) => ({ ...boat })),
    shots: Array.isArray(state?.shots) ? [...state.shots] : []
  };
}

export function useGameState() {
  const [gameState, setGameState] = useState(() =>
    createInitialGameState()
  );
  const [lastSuggestion, setLastSuggestion] = useState(null);
  const boatIdRef = useRef(1);

  function addBoat(length) {
    const safeLength = Math.max(1, Math.round(Number(length) || 1));
    const id = boatIdRef.current++;
    const name = `Boat ${id}`;
    setGameState((prev) => ({
      ...prev,
      boats: [...(prev.boats ?? []), { id, name, length: safeLength, sunk: false }]
    }));
  }

  function toggleBoatSunk(id) {
    setGameState((prev) => ({
      ...prev,
      boats: (prev.boats ?? []).map((boat) =>
        boat.id === id ? { ...boat, sunk: !boat.sunk } : boat
      )
    }));
  }

  function removeBoat(id) {
    setGameState((prev) => ({
      ...prev,
      boats: (prev.boats ?? []).filter((boat) => boat.id !== id)
    }));
  }

  function resetBoard() {
    setGameState((prev) =>
      createInitialGameState({
        rows: prev.board?.length ?? 10,
        cols: prev.board?.[0]?.length ?? 10,
        boats: (prev.boats ?? []).map((boat) => ({ ...boat, sunk: false }))
      })
    );
    setLastSuggestion(null);
  }

  function setBoardSize(nextSize) {
    const parsed = Math.round(Number(nextSize) || 0);
    const safeSize = Math.max(1, parsed);
    setGameState((prev) =>
      createInitialGameState({
        rows: safeSize,
        cols: safeSize,
        boats: (prev.boats ?? []).map((boat) => ({ ...boat, sunk: false }))
      })
    );
    setLastSuggestion(null);
  }

  async function suggestMove() {
    const botInput = cloneGameStateSnapshot(gameState);
    const move = await getBestMove(botInput);
    setGameState(botInput);
    setLastSuggestion(move);
  }

  return {
    gameState,
    setGameState,
    suggestMove,
    lastSuggestion,
    addBoat,
    toggleBoatSunk,
    removeBoat,
    resetBoard,
    setBoardSize
  };
}
