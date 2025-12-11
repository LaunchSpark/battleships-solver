import React from "./vendor/react.js";
import HomePage from "./pages/HomePage.js";
import PlaygroundPage from "./pages/PlaygroundPage.js";

export default function App() {
  return React.createElement(
    "div",
    { className: "app-root" },
    React.createElement(HomePage),
    React.createElement(PlaygroundPage)
  );
}
