import React from "react";

const STATUS = {
  UNKNOWN: 0,
  WATER: 1,
  HIT: 2,
  SUNK: 3,
};

const STATUS_LABELS = {
  [STATUS.UNKNOWN]: "Unknown",
  [STATUS.WATER]: "Water / Miss",
  [STATUS.HIT]: "Hit",
  [STATUS.SUNK]: "Sunk",
};

export default function Cell({ cell, row, col, onCycleState }) {
  const classNames = ["cell"];

  switch (cell?.status) {
    case STATUS.WATER:
      classNames.push("cell-miss");
      break;
    case STATUS.HIT:
      classNames.push("cell-hit");
      break;
    case STATUS.SUNK:
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
      title={STATUS_LABELS[cell?.status ?? STATUS.UNKNOWN]}
    ></div>
  );
}
