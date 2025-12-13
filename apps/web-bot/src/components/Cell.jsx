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

export default function Cell({
  cell,
  row,
  col,
  onCycleState,
  cellSizeClass,
  isSuggested = false
}) {
  const status = cell?.status ?? TILE_STATUS.UNKNOWN;
  const label = STATUS_LABELS[status] ?? "";
  const backgroundClass = STATUS_BG_CLASS[status] ?? STATUS_BG_CLASS[TILE_STATUS.UNKNOWN];

  const ringClass = isSuggested
    ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950"
    : "";

  return (
    <button
      type="button"
      className={`relative flex items-center justify-center text-xs sm:text-sm font-semibold rounded-md border border-slate-800 active:scale-95 transition-transform ${backgroundClass} ${cellSizeClass} ${ringClass}`}
      aria-label={`cell row ${row + 1} column ${col + 1}${isSuggested ? " suggested move" : ""}`}
      role="gridcell"
      onClick={() => onCycleState?.(row, col)}
    >
      {label && <span className={isSuggested ? "opacity-60" : ""}>{label}</span>}
      {isSuggested && (
        <span className="absolute inset-0 flex items-center justify-center text-lg" aria-hidden="true">
          🎯
        </span>
      )}
      {isSuggested && (
        <span className="sr-only">Suggested move indicator</span>
      )}
    </button>
  );
}
