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

function getCellSize(gridSize) {
  const maxSize = gridSize <= 8 ? 2.5 : gridSize <= 12 ? 2.1 : 1.8;
  const columns = gridSize + 2; // include the row/column labels

  return `clamp(1.35rem, calc((100vw - 3rem) / ${columns}), ${maxSize}rem)`;
}

function getLabelClass() {
  return "text-[10px] sm:text-xs text-slate-400 font-semibold flex items-center justify-center bg-slate-900/80 rounded-md border border-slate-800";
}

export default function BoardView({ gameState, setGameState, suggestedMove, heatmap }) {
  const gridSize = gameState.board?.length ?? 0;
  const cellSize = useMemo(() => getCellSize(gridSize), [gridSize]);
  const cellSizeStyle = useMemo(
    () => ({ width: cellSize, height: cellSize, minWidth: cellSize }),
    [cellSize]
  );
  const labelClass = useMemo(() => getLabelClass(), []);
  const templateColumns = useMemo(
    () => `auto repeat(${gridSize}, ${cellSize}) auto`,
    [gridSize, cellSize]
  );
  const templateRows = useMemo(
    () => `auto repeat(${gridSize}, ${cellSize}) auto`,
    [gridSize, cellSize]
  );
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
          gridTemplateColumns: templateColumns,
          gridTemplateRows: templateRows
        }}
      >
        <div className={labelClass} style={cellSizeStyle} aria-hidden="true" />
        {columnLabels.map((label) => (
          <div
            key={`top-col-${label}`}
            className={labelClass}
            style={cellSizeStyle}
            aria-hidden="true"
          >
            {label}
          </div>
        ))}
        <div className={labelClass} style={cellSizeStyle} aria-hidden="true" />

        {gameState.board.map((row, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}>
            <div className={labelClass} style={cellSizeStyle} aria-hidden="true">
              {rowIndex + 1}
            </div>

            {row.map((cell, colIndex) => (
              <Cell
                key={`cell-${rowIndex}-${colIndex}`}
                cell={cell}
                row={rowIndex}
                col={colIndex}
                heat={heatmap?.[rowIndex]?.[colIndex] ?? 0}
                onCycleState={handleCycleState}
                cellSizeStyle={cellSizeStyle}
                isSuggested={
                  suggestedMove?.row === rowIndex && suggestedMove?.col === colIndex
                }
              />
            ))}

            <div className={labelClass} style={cellSizeStyle} aria-hidden="true">
              {rowIndex + 1}
            </div>
          </React.Fragment>
        ))}

        <div className={labelClass} style={cellSizeStyle} aria-hidden="true" />
        {columnLabels.map((label) => (
          <div
            key={`bottom-col-${label}`}
            className={labelClass}
            style={cellSizeStyle}
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
