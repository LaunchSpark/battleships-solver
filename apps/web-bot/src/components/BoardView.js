import React from "../vendor/react.js";
import Cell from "./Cell.js";

export default function BoardView({ gameState }) {
  return React.createElement(
    "div",
    { className: "board" },
    gameState.board.map((row, rowIndex) =>
      React.createElement(
        "div",
        { className: "board-row", key: `row-${rowIndex}` },
        row.map((cell, colIndex) =>
          React.createElement(Cell, {
            key: `cell-${rowIndex}-${colIndex}`,
            cell,
            row: rowIndex,
            col: colIndex,
          })
        )
      )
    )
  );
}
