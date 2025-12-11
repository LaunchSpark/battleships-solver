import React from "../vendor/react.js";

export default function BestMovePanel({ lastSuggestion }) {
  if (!lastSuggestion) {
    return React.createElement(
      "div",
      { className: "best-move-panel" },
      React.createElement("p", null, "Request a move suggestion to see recommendations.")
    );
  }

  return React.createElement(
    "div",
    { className: "best-move-panel" },
    React.createElement("h2", null, "Suggested Move"),
    React.createElement(
      "p",
      null,
      `Row: ${lastSuggestion.row}, Col: ${lastSuggestion.col}`
    ),
    React.createElement("p", null, lastSuggestion.reason)
  );
}
