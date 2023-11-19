import express from "express";
import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import Account from "@/schemas/account.model";
import validator from "@/middlewares/validator";

const router = express.Router();

const schema = Joi.object({
  userid: Joi.string().min(6).max(30).required(),
  password: Joi.string().min(10).max(30).required(),
});

router.post("/", validator(schema), async function (req, res, next) {
  const { userid, password } = req.body;

  try {
    const account = await Account.findById(userid);
    if (!account) return res.status(401).json({ message: "User not found" });

    return account.verifyPassword(password)
      ? res.status(200).header("Authorization", account.generateJWT()).json({
        success: true,
      })
      : res.status(401).json({ success: false, message: "Unauthorized" });
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

export default router;
