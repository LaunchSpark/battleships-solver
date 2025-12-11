import React from "react";

// TODO: add handlers to manipulate game state and request best moves.
export default function Controls({ gameState, setGameState, suggestMove }) {
  return (
    <div className="controls">
      <button type="button" onClick={suggestMove}>
        Suggest Move
      </button>
      {/* Add more controls for resetting board, toggling placements, etc. */}
    </div>
  );
}
