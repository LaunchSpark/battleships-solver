import React from "react";
import BoardView from "./components/BoardView.jsx";
import Controls from "./components/Controls.jsx";
import BestMovePanel from "./components/BestMovePanel.jsx";
import BoatManager from "./components/BoatManager.jsx";
import { useGameState } from "./hooks/useGameState.js";

export default function App() {
  const {
    gameState,
    setGameState,
    suggestMove,
    lastSuggestion,
    addBoat,
    toggleBoatSunk,
    removeBoat,
    resetBoard
  } = useGameState();

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Battleship Solver</h1>
        <p>Click any cell to cycle through unknown → miss → hit → sunk.</p>
      </header>

      <main className="playground">
        <section className="playground-board">
          <BoardView gameState={gameState} setGameState={setGameState} />
        </section>

        <aside className="playground-sidebar">
          <BoatManager
            boats={gameState.boats ?? []}
            onAddBoat={addBoat}
            onToggleSunk={toggleBoatSunk}
            onRemoveBoat={removeBoat}
          />
          <BestMovePanel lastSuggestion={lastSuggestion} />
          <Controls
            suggestMove={suggestMove}
            resetBoard={resetBoard}
          />
        </aside>
      </main>
    </div>
  );
}
