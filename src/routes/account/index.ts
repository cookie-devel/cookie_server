import express from "express";

import profileRouter from "./profile";
import infoRouter from "./info";
import devicesRouter from "./devices";
import friendsReadRouter from "./friends/read";
import friendsUpdateRouter from "./friends/update";
import friendsDeleteRouter from "./friends/delete";

const router = express.Router();

router.use("/profile", profileRouter);
router.use("/info", infoRouter);
router.use("/devices", devicesRouter);
router.use("/friends/read", friendsReadRouter);
router.use("/friends/update", friendsUpdateRouter);
router.use("/friends/delete", friendsDeleteRouter);

export default router;
