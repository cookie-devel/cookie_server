import express from "express";
import Joi from "joi";
import Account from "@/schemas/account.model";
import validator from "@/middlewares/validator";
import { verifyToken } from "@/middlewares/verifyToken";

const router = express.Router();

const schema = Joi.object({
  deviceToken: Joi.string().required(),
});

router.post("/", verifyToken, validator(schema), async (req, res, next) => {
  const userid = req.decoded["userid"];
  try {
    const deviceToken = req.body.deviceToken;
    const result = await Account.findById(userid).exec();
    // If deviceToken already exists, return 200
    if (result.deviceTokens.includes(deviceToken)) {
      return res.sendStatus(200);
    }

    result.deviceTokens.push(deviceToken);
    await result.save();
    return res.sendStatus(201);
  } catch (e: any) {
    console.error(e);
    return next(e);
  }
});

export default router;
