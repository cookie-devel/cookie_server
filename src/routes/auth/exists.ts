import express from "express";
import { Request, Response, NextFunction } from "express";
import Account from "@/schemas/account.model";
import Joi from "joi";
import validator from "@/middlewares/validator";
const router = express.Router();

const schema = Joi.object({
  userid: Joi.string().min(5).max(20).optional(),
  phone: Joi.string().min(11).max(11).optional(),
})
  .or("userid", "phone")
  .required();

router.get("/", validator(schema), async (req, res) => {
  const { userid, phone } = req.query;

  try {
    let found_account;

    if (userid)
      found_account = await Account.findById(userid.toString()).lean();
    else if (phone)
      found_account = await Account.findOne().byPhone(phone.toString()).lean();

    return res.status(200).send({
      result: !(found_account === null),
      message: found_account === null ? "Not Found" : "Already Exists",
    });
  } catch (e: any) {
    return res.status(500).send({
      name: e.name,
      message: e.message,
    });
  }
});

export default router;
