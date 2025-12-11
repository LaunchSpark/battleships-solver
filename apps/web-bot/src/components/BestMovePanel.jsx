import React from "react";

// TODO: display richer move reasoning and history.
export default function BestMovePanel({ lastSuggestion }) {
  if (!lastSuggestion) {
    return (
      <div className="best-move-panel">
        <p>Request a move suggestion to see recommendations.</p>
      </div>
    );
  }

  return (
    <div className="best-move-panel">
      <h2>Suggested Move</h2>
      <p>
        Row: {lastSuggestion.row}, Col: {lastSuggestion.col}
      </p>
      <p>{lastSuggestion.reason}</p>
    </div>
  );
}
