import React from "react";
import { TILE_STATUS } from "battleship-engine";

const STATUS_LABELS = {
  [TILE_STATUS.UNKNOWN]: "Unknown",
  [TILE_STATUS.MISS]: "Water / Miss",
  [TILE_STATUS.HIT]: "Hit",
  [TILE_STATUS.SUNK]: "Sunk",
};

export default function Cell({ cell, row, col, onCycleState }) {
  const classNames = ["cell"];

  switch (cell?.status) {
    case TILE_STATUS.MISS:
      classNames.push("cell-miss");
      break;
    case TILE_STATUS.HIT:
      classNames.push("cell-hit");
      break;
    case TILE_STATUS.SUNK:
      classNames.push("cell-sunk");
      break;
    default:
      break;
  }

  return (
    <div
      className={classNames.join(" ")}
      aria-label={`cell-${row}-${col}`}
      role="gridcell"
      onClick={() => onCycleState?.(row, col)}
      title={STATUS_LABELS[cell?.status ?? TILE_STATUS.UNKNOWN]}
    ></div>
  );
}
