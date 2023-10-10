import express from "express";
import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import Account from "@/schemas/account.model";
import { verifyToken } from "@/middlewares/jwt/verifyToken";

const router = express.Router();

const schema = Joi.object({
  userid: Joi.string().min(6).max(30).required(),
  password: Joi.string().min(10).max(30).required(),
});

const validate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.validateAsync(req.body);
  } catch (e: any) {
    return res.status(400).json({ message: e.message });
  }
  next();
};

// TODO: DRY: Don't Repeat Yourself

router.get("/", verifyToken, async function (req, res, next) {
  const { userid } = req.decoded;

  try {
    const account = await Account.findById(userid);
    if (!account) return res.status(401).json({ message: "User not found" });

    return res.status(200).json({
      success: true,
      account: {
        id: account._id,
        name: account.name,
        phone: account.phone,
        profile: account.profile,
        friendList: await account.getFriends(),
      },
      access_token: account.generateJWT(),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send({ message: "Internal Server Error" });
  }
});

router.post("/", validate, async function (req, res, next) {
  const { userid, password } = req.body;

  try {
    const account = await Account.findById(userid);
    if (!account) return res.status(401).json({ message: "User not found" });

    const verified = account.verifyPassword(password);
    if (verified)
      return res.status(200).json({
        success: verified,
        account: {
          id: account._id,
          name: account.name,
          phone: account.phone,
          profile: account.profile,
          friendList: await account.getFriends(),
        },
        access_token: account.generateJWT(),
      });
    else
      return res
        .status(401)
        .json({ success: verified, message: "Unauthorized" });
  } catch (e) {
    console.error(e);
    return res.status(500).send({ message: "Internal Server Error" });
  }
});

export default router;
