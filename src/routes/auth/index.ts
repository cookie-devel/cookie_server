import express from "express";
import signinRouter from "./signin";
import signupRouter from "./signup";

const router = express.Router();

router.use("/signin", signinRouter);
router.use("/signup", signupRouter);

export default router;
