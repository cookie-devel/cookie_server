import express from "express";
import verifyToken from "../../middlewares/jwt/verifyToken.js";
import Account from "../../schemas/account.model.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const friendList = await Account.getFriends(req.decoded["userid"]);

    return res.status(200).send({
      success: true,
      result: friendList,
    });
  } catch (e) {
    return res.status(500).send({
      code: 500,
      message: e,
    });
  }
});

export default router;
