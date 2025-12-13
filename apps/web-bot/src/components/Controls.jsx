import React from "react";

export default function Controls({ suggestMove, resetBoard }) {
  return (
    <div className="controls">
      <button type="button" onClick={suggestMove}>
        Suggest Move
      </button>
      <button type="button" onClick={resetBoard}>
        Reset Board States
      </button>
      <p className="muted-text">
        Cell states cycle deterministically in this order: unknown → miss → hit → sunk → unknown.
        Sunk cells and recorded misses block silhouettes in the solver heat map.
      </p>
    </div>
  );
}
