import express from "express";

import profileRouter from "./profile";
import infoRouter from "./info";

const router = express.Router();

router.use("/profile", profileRouter);
router.use("/info", infoRouter);

export default router;
