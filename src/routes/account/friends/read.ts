import express from "express";
import Account from "@/schemas/account.model";
import { verifyToken } from "@/middlewares/verifyToken";
import validator from "@/middlewares/validator";
import Joi from "joi";
import _ from "lodash";

const router = express.Router();

const schema = Joi.object({
  fields: Joi.string().optional(),
});

router.post("/", verifyToken, validator(schema), async (req, res) => {
  // const userid = req.decoded["userid"];
  const { friendId } = req.query;
  try {
    const account = await Account.findById(friendId).exec();
    if (account == null) return res.status(404).json({ message: "Not Found" });

    const json = {
      id: account._id,
      name: account.name,
      profile: account.profile,
    };

    if (req.query.fields) {
      const subset = _.pick(json, (req.query.fields as string).split(","));
      return res.status(200).json(subset);
    } else return res.status(200).json(json);
  } catch (e) {
    console.error(e);
  }
});

export default router;
