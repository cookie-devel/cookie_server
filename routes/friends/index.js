import express from "express";
import verifyToken from "../../middlewares/jwt/verifyToken.js";
import Account from "../../schemas/account.model.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const found_account = await Account.findUser({
      userid: req.decoded["userid"],
    }).exec();
    return await res.status(200).send({
      success: true,
      result: found_account.friendList,
    });
  } catch (e) {
    return res.status(500).send({
      code: 500,
      message: e,
    });
  }
});

export default router;
