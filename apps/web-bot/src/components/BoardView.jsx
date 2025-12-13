import React, { useCallback } from "react";
import { applyShot, TILE_STATUS } from "battleship-engine";
import Cell from "./Cell.jsx";

const STATUS_ORDER = [
  TILE_STATUS.UNKNOWN,
  TILE_STATUS.MISS,
  TILE_STATUS.HIT,
  TILE_STATUS.SUNK
];
// Keep the cycle deterministic across renders: UNKNOWN → MISS → HIT → SUNK → UNKNOWN.

function getNextStatus(currentStatus) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  if (currentIndex === -1) {
    return TILE_STATUS.UNKNOWN;
  }
  return STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];
}

export default function BoardView({ gameState, setGameState }) {
  const handleCycleState = useCallback(
    (row, col) => {
      if (!setGameState) return;

      setGameState((prev) => {
        const currentStatus = prev?.board?.[row]?.[col]?.status ?? TILE_STATUS.UNKNOWN;
        const nextStatus = getNextStatus(currentStatus);
        return applyShot(prev, row, col, nextStatus);
      });
    },
    [setGameState]
  );

  return (
    <div className="board" role="grid" aria-label="player-board">
      {gameState.board.map((row, rowIndex) => (
        <div className="board-row" role="row" key={`row-${rowIndex}`}>
          {row.map((cell, colIndex) => (
            <Cell
              key={`cell-${rowIndex}-${colIndex}`}
              cell={cell}
              row={rowIndex}
              col={colIndex}
              onCycleState={handleCycleState}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
