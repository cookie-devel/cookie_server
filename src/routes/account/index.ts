import express from "express";

import existsRouter from "./exists";
// import signinRouter from "../auth/signin";
// import signupRouter from "./signup";
import profileRouter from "./profile";
import infoRouter from "./info";

const router = express.Router();

router.use("/exists", existsRouter);
// router.use("/signin", signinRouter);
// router.use("/signup", signupRouter);
router.use("/profile", profileRouter);
router.use("/info", infoRouter);

export default router;
