import express from "express";
import Joi from "joi";
import Account from "@/schemas/account.model";
import Device from "@/schemas/device.model";
import validator from "@/middlewares/validator";
import { verifyToken } from "@/middlewares/verifyToken";

const router = express.Router();

const schema = Joi.object({
  udid: Joi.string().required(),
  token: Joi.string().required(),
});

router.patch("/", verifyToken, validator(schema), async (req, res, next) => {
  console.log("PATCH /devices");
  const userid = req.decoded["userid"];
  try {
    const udid = req.body.udid;
    const token = req.body.token;

    console.log(udid, token);

    const device = await Device.findOneAndUpdate(
      { udid },
      { token },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    await Account.updateOne(
      { _id: userid },
      { $addToSet: { deviceTokens: device._id } }
    ).exec();
    return res.sendStatus(200);
  } catch (e: any) {
    console.error(e);
    return next(e);
  }
});

export default router;
