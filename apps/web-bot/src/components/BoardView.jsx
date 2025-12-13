import React, { useCallback } from "react";
import { applyShot } from "battleship-engine";
import Cell from "./Cell.jsx";

const STATUS = {
  UNKNOWN: 0,
  WATER: 1,
  HIT: 2,
  SUNK: 3,
};

const STATUS_ORDER = [STATUS.UNKNOWN, STATUS.WATER, STATUS.HIT, STATUS.SUNK];

function getNextStatus(currentStatus) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  if (currentIndex === -1) {
    return STATUS.UNKNOWN;
  }
  return STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];
}

export default function BoardView({ gameState, setGameState }) {
  const handleCycleState = useCallback(
    (row, col) => {
      if (!setGameState) return;

      setGameState((prev) => {
        const currentStatus = prev?.board?.[row]?.[col]?.status ?? STATUS.UNKNOWN;
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
