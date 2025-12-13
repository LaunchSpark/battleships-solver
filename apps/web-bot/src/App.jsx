import React, { useEffect, useMemo, useState } from "react";
import BoardView from "./components/BoardView.jsx";
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
    resetBoard,
    setBoardSize
  } = useGameState();

  const boats = gameState.boats ?? [];
  const gridSize = gameState.board?.length ?? 10;
  const [gridSizeInput, setGridSizeInput] = useState(gridSize);
  const [shipLengthInput, setShipLengthInput] = useState(3);

  useEffect(() => {
    setGridSizeInput(gridSize);
  }, [gridSize]);

  const handleApplyGridSize = () => {
    const parsed = Math.round(Number(gridSizeInput) || gridSize);
    const safeSize = Math.max(1, parsed);
    setGridSizeInput(safeSize);
    setBoardSize(safeSize);
  };

  const handleAddShip = () => {
    addBoat(shipLengthInput);
  };

  const handleRemoveLastShip = () => {
    const lastBoat = boats[boats.length - 1];
    if (lastBoat) {
      removeBoat(lastBoat.id);
    }
  };

  const legend = useMemo(
    () => [
      { label: "Unknown", className: "bg-slate-800" },
      { label: "Miss", className: "bg-sky-900" },
      { label: "Hit", className: "bg-yellow-600" },
      { label: "Sunk", className: "bg-red-700" }
    ],
    []
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center px-4 py-4">
      <div className="w-full max-w-xl flex flex-col gap-4">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <h1 className="text-xl font-semibold">Battleship Board Editor</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Tap any cell to cycle unknown → miss → hit → sunk.
          </p>
        </header>

        <section className="bg-slate-900/60 rounded-2xl border border-slate-800 p-3 sm:p-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex flex-1 items-center gap-2">
              <span className="text-sm text-slate-300">Grid size</span>
              <input
                type="number"
                min={1}
                value={gridSizeInput}
                onChange={(e) => setGridSizeInput(e.target.value)}
                className="rounded-xl bg-slate-950 border border-slate-700 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-50"
              />
            </div>
            <button
              type="button"
              className="rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold bg-sky-600 hover:bg-sky-500 active:bg-sky-700 transition-colors"
              onClick={handleApplyGridSize}
            >
              Apply
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex flex-1 items-center gap-2">
              <span className="text-sm text-slate-300">Ship length</span>
              <input
                type="number"
                min={1}
                value={shipLengthInput}
                onChange={(e) => setShipLengthInput(e.target.value)}
                className="rounded-xl bg-slate-950 border border-slate-700 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-50"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddShip}
                className="rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors"
              >
                Add Ship
              </button>
              <button
                type="button"
                onClick={handleRemoveLastShip}
                disabled={boats.length === 0}
                className="rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 active:bg-rose-700 transition-colors disabled:bg-slate-800 disabled:text-slate-500"
              >
                Remove Last
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {boats.length === 0 && (
              <span className="text-xs text-slate-500">No ships added yet.</span>
            )}
            {boats.map((boat) => (
              <button
                key={boat.id}
                type="button"
                onClick={() => toggleBoatSunk?.(boat.id)}
                className={`flex items-center gap-2 px-3 py-1 rounded-xl border border-slate-700 bg-slate-950 text-xs sm:text-sm transition-colors ${
                  boat.sunk ? "bg-slate-800 text-slate-300" : "text-slate-200"
                }`}
              >
                <span className="font-semibold">L{boat.length}</span>
                <span className="text-slate-400">{boat.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs ${
                    boat.sunk ? "bg-red-700" : "bg-slate-800"
                  }`}
                >
                  {boat.sunk ? "Sunk" : "Afloat"}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <button
              type="button"
              onClick={suggestMove}
              className="rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold bg-sky-600 hover:bg-sky-500 active:bg-sky-700 transition-colors"
            >
              Suggest Move
            </button>
            <button
              type="button"
              onClick={resetBoard}
              className="rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-800 transition-colors"
            >
              Reset Board States
            </button>
            <p className="text-xs text-slate-500 flex-1">
              Cell states cycle deterministically: unknown → miss → hit → sunk → unknown.
            </p>
          </div>
        </section>

        <section className="bg-slate-900/60 rounded-2xl border border-slate-800 p-3 sm:p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold text-slate-200">Board</h2>
              <p className="text-xs text-slate-500">Grid size: {gridSize} x {gridSize}</p>
            </div>
            {lastSuggestion && (
              <div className="text-right">
                <p className="text-xs text-slate-400">Suggested Move</p>
                <p className="text-sm font-semibold text-slate-50">
                  Row {lastSuggestion.row}, Col {lastSuggestion.col}
                </p>
              </div>
            )}
          </div>

          <div className="overflow-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-2">
            <BoardView gameState={gameState} setGameState={setGameState} />
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-300">
            {legend.map((item) => (
              <span key={item.label} className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-md border border-slate-700 ${item.className}`}></span>
                {item.label}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
