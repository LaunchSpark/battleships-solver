import React from "react";

// TODO: add click/long-press handlers for hits/misses/ships.
export default function Cell({ cell, row, col }) {
  const classNames = ["cell"];
  if (cell.hit) classNames.push("cell-hit");
  if (cell.miss) classNames.push("cell-miss");
  if (cell.ship) classNames.push("cell-ship");

  return <div className={classNames.join(" ")} aria-label={`cell-${row}-${col}`}></div>;
}
