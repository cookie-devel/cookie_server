import express from "express";

import createRoomRouter from "./create_room";

const router = express.Router();

router.use("/create_room", createRoomRouter);

export default router;
