import React from "react";
import { TILE_STATUS } from "battleship-engine";

const STATUS_LABELS = {
  [TILE_STATUS.UNKNOWN]: "",
  [TILE_STATUS.MISS]: "M",
  [TILE_STATUS.HIT]: "H",
  [TILE_STATUS.SUNK]: "S"
};

const STATUS_BG_CLASS = {
  [TILE_STATUS.UNKNOWN]: "bg-slate-800 hover:bg-slate-700",
  [TILE_STATUS.MISS]: "bg-sky-900",
  [TILE_STATUS.HIT]: "bg-yellow-600",
  [TILE_STATUS.SUNK]: "bg-red-700"
};

export default function Cell({ cell, row, col, onCycleState, cellSizeClass }) {
  const status = cell?.status ?? TILE_STATUS.UNKNOWN;
  const label = STATUS_LABELS[status] ?? "";
  const backgroundClass = STATUS_BG_CLASS[status] ?? STATUS_BG_CLASS[TILE_STATUS.UNKNOWN];

  return (
    <button
      type="button"
      className={`flex items-center justify-center text-xs sm:text-sm font-semibold rounded-md border border-slate-800 active:scale-95 transition-transform ${backgroundClass} ${cellSizeClass}`}
      aria-label={`cell-${row}-${col}`}
      role="gridcell"
      onClick={() => onCycleState?.(row, col)}
    >
      {label}
    </button>
  );
}
