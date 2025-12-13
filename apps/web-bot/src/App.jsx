import React from "react";
import BoardView from "./components/BoardView.jsx";
import Controls from "./components/Controls.jsx";
import BestMovePanel from "./components/BestMovePanel.jsx";
import { useGameState } from "./hooks/useGameState.js";

export default function App() {
  const { gameState, setGameState, suggestMove, lastSuggestion } = useGameState();

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Battleship Solver</h1>
        <p>Click any cell to cycle between unknown, water, hit, and sunk.</p>
      </header>

      <main className="playground">
        <section className="playground-board">
          <BoardView gameState={gameState} setGameState={setGameState} />
        </section>

        <aside className="playground-sidebar">
          <BestMovePanel lastSuggestion={lastSuggestion} />
          <Controls
            gameState={gameState}
            setGameState={setGameState}
            suggestMove={suggestMove}
          />
        </aside>
      </main>
    </div>
  );
}
