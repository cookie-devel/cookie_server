import express from "express";
import Joi from "joi";
import Account from "@/schemas/account.model";
import { verifyToken } from "@/middlewares/jwt/verifyToken";
import _ from "lodash";

const router = express.Router();

const schema = Joi.object({
  fields: Joi.string().optional(),
});

router.get("/", verifyToken, async function (req, res) {
  const userid = req.decoded["userid"];

  try {
    await schema.validateAsync(req.query);
  } catch (e: any) {
    return res.status(400).json({ message: e.message });
  }

  try {
    const account = await Account.findById(userid).exec();
    const json = {
      id: account._id,
      name: account.name,
      phone: account.phone,
      profile: account.profile,
      friendList: await account.getFriends(),
    };

    if (req.query.fields) {
      const subset = _.pick(json, (req.query.fields as string).split(","));
      return res.status(200).json(subset);
    } else return res.status(200).json(json);
  } catch (e) {
    console.error(e);
    return res.status(500).send({ message: "Internal Server Error" });
  }
});

export default router;
