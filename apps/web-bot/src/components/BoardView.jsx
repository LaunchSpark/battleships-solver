import React, { useCallback, useMemo } from "react";
import { applyShot, TILE_STATUS } from "battleship-engine";
import Cell from "./Cell.jsx";

const STATUS_ORDER = [
  TILE_STATUS.UNKNOWN,
  TILE_STATUS.MISS,
  TILE_STATUS.HIT,
  TILE_STATUS.SUNK
];

function getNextStatus(currentStatus) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  if (currentIndex === -1) {
    return TILE_STATUS.UNKNOWN;
  }
  return STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];
}

function getCellSizeClass(gridSize) {
  if (gridSize <= 8) return "w-10 h-10";
  if (gridSize <= 12) return "w-8 h-8";
  return "w-7 h-7";
}

function getLabelClass(cellSizeClass) {
  return `${cellSizeClass} text-[10px] sm:text-xs text-slate-400 font-semibold flex items-center justify-center bg-slate-900/80 rounded-md border border-slate-800`;
}

export default function BoardView({ gameState, setGameState, suggestedMove }) {
  const gridSize = gameState.board?.length ?? 0;
  const cellSizeClass = useMemo(() => getCellSizeClass(gridSize), [gridSize]);
  const labelClass = useMemo(() => getLabelClass(cellSizeClass), [cellSizeClass]);
  const columnLabels = useMemo(
    () => Array.from({ length: gridSize }, (_, index) => index + 1),
    [gridSize]
  );

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
    <div className="inline-block">
      <div
        className="grid gap-1"
        aria-label="player-board"
        style={{
          gridTemplateColumns: `auto repeat(${gridSize}, minmax(0, 1fr)) auto`,
          gridTemplateRows: `auto repeat(${gridSize}, minmax(0, 1fr)) auto`
        }}
      >
        <div className={labelClass} aria-hidden="true" />
        {columnLabels.map((label) => (
          <div key={`top-col-${label}`} className={labelClass} aria-hidden="true">
            {label}
          </div>
        ))}
        <div className={labelClass} aria-hidden="true" />

        {gameState.board.map((row, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}>
            <div className={labelClass} aria-hidden="true">
              {rowIndex + 1}
            </div>

            {row.map((cell, colIndex) => (
              <Cell
                key={`cell-${rowIndex}-${colIndex}`}
                cell={cell}
                row={rowIndex}
                col={colIndex}
                onCycleState={handleCycleState}
                cellSizeClass={cellSizeClass}
                isSuggested={
                  suggestedMove?.row === rowIndex && suggestedMove?.col === colIndex
                }
              />
            ))}

            <div className={labelClass} aria-hidden="true">
              {rowIndex + 1}
            </div>
          </React.Fragment>
        ))}

        <div className={labelClass} aria-hidden="true" />
        {columnLabels.map((label) => (
          <div
            key={`bottom-col-${label}`}
            className={labelClass}
            aria-hidden="true"
          >
            {label}
          </div>
        ))}
        <div className={labelClass} aria-hidden="true" />
      </div>
    </div>
  );
}
