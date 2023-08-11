import express from "express";
import existsRouter from "./exists";
import signinRouter from "./signin";
import signupRouter from "./signup";

const router = express.Router();

router.use("/exists", existsRouter);
router.use("/signin", signinRouter);
router.use("/signup", signupRouter);

export default router;
