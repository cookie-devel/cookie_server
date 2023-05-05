import express from "express";
import Joi from "joi";
import Account from "../../schemas/account.model.js";

const router = express.Router();

const schema = Joi.object({
  userid: Joi.string().min(6).max(30).required(),
  password: Joi.string().min(10).max(30).required(),
});

router.post("/", async function (req, res, next) {
  const { userid, password } = req.body;

  try {
    await schema.validateAsync(req.body);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }

  try {
    const account = await Account.findUser({ userid }).exec();
    const verified = account.verifyPassword(password);
    if (verified)
      return res.status(200).json({
        success: verified,
        account: {
          userid: account.userid,
          phone: account.phone,
          friendList: account.friendList,
        },
        access_token: account.generateJWT(),
      });
    else
      return res
        .status(401)
        .json({ success: verified, message: "Unauthorized" });
  } catch {
    return res.status(500).send({ message: "Internal Server Error" });
  }
});

export default router;
