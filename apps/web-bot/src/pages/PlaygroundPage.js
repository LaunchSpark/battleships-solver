import React from "../vendor/react.js";
import BoardView from "../components/BoardView.js";
import Controls from "../components/Controls.js";
import BestMovePanel from "../components/BestMovePanel.js";
import { useGameState } from "../hooks/useGameState.js";

export default function PlaygroundPage() {
  const { gameState, setGameState, suggestMove, lastSuggestion } = useGameState();

  return React.createElement(
    "main",
    { className: "playground" },
    React.createElement(
      "section",
      { className: "playground-board" },
      React.createElement(BoardView, { gameState, setGameState })
    ),
    React.createElement(
      "section",
      { className: "playground-sidebar" },
      React.createElement(Controls, { gameState, setGameState, suggestMove }),
      React.createElement(BestMovePanel, { gameState, lastSuggestion })
    )
  );
}
