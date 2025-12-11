import React from "react";
import HomePage from "./pages/HomePage.jsx";
import PlaygroundPage from "./pages/PlaygroundPage.jsx";

// For now keep it simple: show the playground directly or toggle with local state.
// Router can be added later if needed.

export default function App() {
  return (
    <div className="app-root">
      <HomePage />
      <PlaygroundPage />
    </div>
  );
}
