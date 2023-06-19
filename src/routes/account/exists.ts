import express from "express";
import Account from "../../schemas/account.model";
import Joi from "joi";
const router = express.Router();

const schema = Joi.object({
  userid: Joi.string().min(5).max(20).optional(),
  phone: Joi.string().min(11).max(11).optional(),
})
  .or("userid", "phone")
  .required();

const validate = async (req: express.Request, res: express.Response, next) => {
  try {
    await schema.validateAsync(req.query);
  } catch (e: any) {
    return res.status(400).json({
      name: e.name,
      message: e.message
    });
  }
  next();
};

router.get("/", validate, async (req, res, next) => {
  const { userid, phone } = req.query;

  try {
    const found_account = await Account.findUser({ userid, phone }).lean();

    return await res.status(200).send({
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
