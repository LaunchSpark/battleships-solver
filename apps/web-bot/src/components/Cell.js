import React from "../vendor/react.js";

export default function Cell({ cell, row, col }) {
  const classNames = ["cell"];
  if (cell.hit) classNames.push("cell-hit");
  if (cell.miss) classNames.push("cell-miss");
  if (cell.ship) classNames.push("cell-ship");

  return React.createElement("div", {
    className: classNames.join(" "),
    "aria-label": `cell-${row}-${col}`,
  });
}
