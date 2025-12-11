import React from "react";
import Cell from "./Cell.jsx";

// TODO: wire up interactions for marking hits/misses and ships.
export default function BoardView({ gameState, setGameState }) {
  return (
    <div className="board">
      {gameState.board.map((row, rowIndex) => (
        <div className="board-row" key={`row-${rowIndex}`}>
          {row.map((cell, colIndex) => (
            <Cell key={`cell-${rowIndex}-${colIndex}`} cell={cell} row={rowIndex} col={colIndex} />
          ))}
        </div>
      ))}
    </div>
  );
}
