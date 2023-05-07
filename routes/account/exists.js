import express from "express";
import Account from "../../schemas/account.model.js";
import Joi from "joi";
const router = express.Router();

const schema = Joi.object({
  userid: Joi.string().min(5).max(20).optional(),
  phone: Joi.string().min(11).max(11).optional(),
})
  .or("userid", "phone")
  .required();

router.get("/", async (req, res, next) => {
  const { userid, phone } = req.query;

  try {
    await schema.validateAsync(req.query);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }

  try {
    const found_account = await Account.findUser({ userid, phone }).lean();

    return await res.status(200).send({
      query: req.query,
      result: !(found_account === null),
      message: found_account === null ? "Not Found" : "Already Exists",
    });
  } catch (e) {
    return res.status(500).send(e);
  }
});

export default router;
