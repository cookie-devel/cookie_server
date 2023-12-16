import express from "express";
import Account from "@/schemas/account.model";
import { verifyToken } from "@/middlewares/verifyToken";
import validator from "@/middlewares/validator";
import Joi from "joi";

const router = express.Router();

const schema = Joi.object({
  fields: Joi.string().optional(),
});

router.delete("/", verifyToken, validator(schema), async (req, res) => {
  const userid = req.decoded["userid"];
  const { friendId } = req.query;
  try {
    const account = await Account.findById(friendId).exec();
    const myAccount = await Account.findById(userid).exec();
    myAccount.friendIDs.splice(myAccount.friendIDs.indexOf(account._id), 1);
    await myAccount.save();
    res.status(200).json({ message: "삭제가 성공적으로 완료되었습니다." });
  } catch (e) {
    console.error(e);
  }
});

export default router;
