import express from "express";

import getRoomsRouter from "./rooms";

const router = express.Router();

router.use("/rooms", getRoomsRouter);

export default router;
