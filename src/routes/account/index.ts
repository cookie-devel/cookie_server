import express from "express";

import profileRouter from "./profile";
import infoRouter from "./info";
import devicesRouter from "./devices";

const router = express.Router();

router.use("/profile", profileRouter);
router.use("/info", infoRouter);
router.use("/devices", devicesRouter);

export default router;
