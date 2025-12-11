import React from "../vendor/react.js";

export default function HomePage() {
  return React.createElement(
    "header",
    { className: "app-header" },
    React.createElement("h1", null, "Battleship Bot"),
    React.createElement(
      "p",
      null,
      "A web-based assistant that recommends the next best move in Battleship. ",
      "Works on desktop and mobile browsers. No native app required."
    )
  );
}
