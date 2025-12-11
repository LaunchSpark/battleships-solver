import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// TODO: wire up routes from ./routes once implemented.
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "battleship-api" });
});

app.listen(port, () => {
  console.log(`battleship-api listening on port ${port}`);
});
