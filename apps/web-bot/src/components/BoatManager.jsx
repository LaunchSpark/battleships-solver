import React, { useState } from "react";

export default function BoatManager({ boats, onAddBoat, onToggleSunk, onRemoveBoat }) {
  const [lengthInput, setLengthInput] = useState(3);

  const handleSubmit = (event) => {
    event.preventDefault();
    const parsed = Number(lengthInput);
    const length = Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 1;
    onAddBoat?.(length);
  };

  return (
    <div className="boat-panel">
      <h2>Boats</h2>
      <p className="muted-text">
        Add boats by length to constrain the solver. Boats are metadata only—no placement is drawn on the grid.
      </p>

      <form className="add-boat-form" onSubmit={handleSubmit}>
        <label className="input-label">
          Length
          <input
            type="number"
            min={1}
            step={1}
            value={lengthInput}
            onChange={(e) => setLengthInput(e.target.value)}
          />
        </label>
        <button type="submit">Add Boat</button>
      </form>

      <div className="boat-list">
        {boats.length === 0 && <p className="muted-text">No boats added yet.</p>}
        {boats.map((boat) => (
          <div key={boat.id} className="boat-card">
            <div className="boat-meta">
              <span className="boat-name">{boat.name}</span>
              <span className="boat-length">Length {boat.length}</span>
              <span className="boat-status">
                Status: {boat.sunk ? "Sunk" : "Afloat"}
              </span>
            </div>
            <div className="boat-actions">
              <button type="button" onClick={() => onToggleSunk?.(boat.id)}>
                {boat.sunk ? "Mark Afloat" : "Mark Sunk"}
              </button>
              <button type="button" onClick={() => onRemoveBoat?.(boat.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
