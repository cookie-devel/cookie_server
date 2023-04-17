import express from "express";
import Joi from "joi";
const router = express.Router();

import Account from "../../schemas/account.model.js";

const schema = Joi.object({
  userid: Joi.string().min(6).max(30).required(),
  password: Joi.string().min(10).max(30).required(),
  username: Joi.string().min(1).max(10).required(),
  birthday: Joi.date().required(),
  phone: Joi.string().min(11).max(11).required(),
  profile: Joi.object(),
});

router.post("/", async (req, res, next) => {
  try {
    await schema.validateAsync(req.body);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }

  try {
    const result = await Account.createAccount(req.body);
    return res.status(201).json({
      success: true,
      account: {
        _id: result._id,
        userid: result.userid,
        username: result.username,
      },
      token: account.generateJWT(),
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      e,
    });
  }
});

export default router;
