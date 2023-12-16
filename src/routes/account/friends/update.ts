import express from "express";
import Account from "@/schemas/account.model";
import { verifyToken } from "@/middlewares/verifyToken";
import validator from "@/middlewares/validator";
import Joi from "joi";

const router = express.Router();

const schema = Joi.object({
  fields: Joi.string().optional(),
});

router.get("/", verifyToken, validator(schema), async (req, res) => {
  const userid = req.decoded["userid"];
  const { friendId } = req.query;
  try {
    const account = await Account.findById(friendId).exec();
    const myAccount = await Account.findById(userid).exec();
    if (myAccount.friendIDs.includes(account._id))
      return res.status(409).json({ message: "Already Friend" });
    myAccount.friendIDs.push(account._id);
    await myAccount.save();
  } catch (e) {
    console.error(e);
  }
});

export default router;
