import React from "react";
import BoardView from "../components/BoardView.jsx";
import Controls from "../components/Controls.jsx";
import BestMovePanel from "../components/BestMovePanel.jsx";
import { useGameState } from "../hooks/useGameState.js";

export default function PlaygroundPage() {
  const { gameState, setGameState, suggestMove, lastSuggestion } = useGameState();

  return (
    <main className="playground">
      <section className="playground-board">
        <BoardView gameState={gameState} setGameState={setGameState} />
      </section>
      <section className="playground-sidebar">
        <Controls gameState={gameState} setGameState={setGameState} suggestMove={suggestMove} />
        <BestMovePanel gameState={gameState} lastSuggestion={lastSuggestion} />
      </section>
    </main>
  );
}
