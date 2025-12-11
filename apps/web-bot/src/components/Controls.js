import React from "../vendor/react.js";

export default function Controls({ suggestMove }) {
  return React.createElement(
    "div",
    { className: "controls" },
    React.createElement(
      "button",
      { type: "button", onClick: suggestMove },
      "Suggest Move"
    )
  );
}
