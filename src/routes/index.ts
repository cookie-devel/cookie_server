import { Request, Response, NextFunction } from "express";
import express from "express";

import accountRouter from "@/routes/account/index";
import authRouter from "@/routes/auth/index";
import chatRouter from "@/routes/chat/index";

const router = express.Router();

// Routes
router.use("/account", accountRouter);
router.use("/auth", authRouter);
router.use("/chat", chatRouter);

export { authRouter, accountRouter, chatRouter };
export default router;
