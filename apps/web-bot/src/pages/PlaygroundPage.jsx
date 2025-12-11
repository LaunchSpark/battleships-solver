import React, { useMemo, useState } from "react";

let nextBoatId = 1;

export default function PlaygroundPage() {
  const [gridSize, setGridSize] = useState(10);
  const [pendingGridSize, setPendingGridSize] = useState(10);
  const [boats, setBoats] = useState([]);
  const [newBoatLength, setNewBoatLength] = useState(3);
  const [draggingBoatId, setDraggingBoatId] = useState(null);

  const boardCells = useMemo(() => {
    const cells = Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => null));

    boats.forEach((boat) => {
      if (!boat.placed) return;
      const { row, col, length, orientation, id } = boat;
      for (let i = 0; i < length; i++) {
        const r = orientation === "H" ? row : row + i;
        const c = orientation === "H" ? col + i : col;
        if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
          cells[r][c] = id;
        }
      }
    });

    return cells;
  }, [boats, gridSize]);

  const canPlace = (boatId, row, col, orientation, length) => {
    if (orientation === "H") {
      if (col + length > gridSize) return false;
    } else if (row + length > gridSize) return false;

    for (let i = 0; i < length; i++) {
      const r = orientation === "H" ? row : row + i;
      const c = orientation === "H" ? col + i : col;
      const occupiedBy = boardCells[r][c];
      if (occupiedBy !== null && occupiedBy !== boatId) return false;
    }
    return true;
  };

  const handleApplyGrid = () => {
    const nextSize = Math.max(3, Math.min(20, Number(pendingGridSize) || gridSize));
    setGridSize(nextSize);
    setPendingGridSize(nextSize);
    setBoats((existing) =>
      existing.map((boat) => {
        if (!boat.placed) return boat;
        const fitsHorizontally = boat.orientation === "H" && boat.col + boat.length <= nextSize;
        const fitsVertically = boat.orientation === "V" && boat.row + boat.length <= nextSize;
        const fits = fitsHorizontally || fitsVertically;
        return fits ? boat : { ...boat, placed: false, row: null, col: null };
      })
    );
  };

  const handleAddBoat = () => {
    const length = Math.max(1, Math.min(gridSize, Number(newBoatLength) || 1));
    setBoats([
      ...boats,
      { id: nextBoatId++, length, orientation: "H", placed: false, row: null, col: null },
    ]);
    setNewBoatLength(length);
  };

  const handleDrop = (row, col) => {
    if (!draggingBoatId) return;
    const boat = boats.find((item) => item.id === draggingBoatId);
    if (!boat) return;
    if (!canPlace(boat.id, row, col, boat.orientation, boat.length)) return;
    setBoats((prev) =>
      prev.map((item) =>
        item.id === boat.id ? { ...item, placed: true, row, col } : item
      )
    );
  };

  const toggleOrientation = (id) => {
    setBoats((prev) =>
      prev.map((boat) => {
        if (boat.id !== id) return boat;
        const nextOrientation = boat.orientation === "H" ? "V" : "H";
        const stillFits =
          boat.row !== null &&
          boat.col !== null &&
          canPlace(boat.id, boat.row, boat.col, nextOrientation, boat.length);
        return {
          ...boat,
          orientation: nextOrientation,
          placed: stillFits ? boat.placed : false,
          row: stillFits ? boat.row : null,
          col: stillFits ? boat.col : null,
        };
      })
    );
  };

  const resetPlacement = (id) => {
    setBoats((prev) => prev.map((boat) => (boat.id === id ? { ...boat, placed: false, row: null, col: null } : boat)));
  };

  return (
    <>
      <header className="ui-header">
        <h1>Battleship Solver UI</h1>
        <div className="grid-controls">
          <label>
            Grid:
            <input
              type="number"
              value={pendingGridSize}
              min={3}
              max={20}
              onChange={(e) => setPendingGridSize(e.target.value)}
            />
          </label>
          <button type="button" onClick={handleApplyGrid}>
            Apply
          </button>
        </div>
      </header>

      <div className="ui-main">
        <aside className="ui-sidebar">
          <h2>Boats</h2>
          <div className="add-boat">
            <label>
              Length:
              <input
                type="number"
                min={1}
                max={gridSize}
                value={newBoatLength}
                onChange={(e) => setNewBoatLength(e.target.value)}
              />
            </label>
            <button type="button" onClick={handleAddBoat}>
              Add Boat
            </button>
          </div>

          <div className="boat-list">
            {boats.map((boat) => (
              <div
                key={boat.id}
                className={`boat-card${boat.placed ? " placed" : ""}`}
                draggable
                onDragStart={() => setDraggingBoatId(boat.id)}
                onDragEnd={() => setDraggingBoatId(null)}
              >
                <div className="boat-meta">
                  <span>Boat #{boat.id}</span>
                  <span>
                    Length {boat.length} · {boat.orientation === "H" ? "Horizontal" : "Vertical"}
                  </span>
                  {boat.placed && boat.row !== null && boat.col !== null && (
                    <span>
                      Row {boat.row + 1}, Col {boat.col + 1}
                    </span>
                  )}
                </div>
                <div className="boat-actions">
                  <button type="button" onClick={() => toggleOrientation(boat.id)}>
                    Rotate
                  </button>
                  <button type="button" onClick={() => resetPlacement(boat.id)}>
                    Reset
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="grid-section">
          <h2>Grid</h2>
          <div className="grid-wrapper">
            {boardCells.map((row, rowIndex) => (
              <div className="grid-row" key={`row-${rowIndex}`}>
                {row.map((cell, colIndex) => (
                  <div
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={`grid-cell${cell !== null ? " occupied" : ""}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(rowIndex, colIndex)}
                  >
                    {cell !== null ? cell : ""}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
