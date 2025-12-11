import { Router } from "express";
import { suggestMove } from "../controllers/battleshipController.js";

const router = Router();

// TODO: wire up additional routes for gameplay interactions.
router.post("/suggest-move", suggestMove);

export default router;
