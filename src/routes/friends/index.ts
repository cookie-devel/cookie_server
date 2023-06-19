import express from "express";
import { verifyToken } from "../../middlewares/jwt/verifyToken";
import Account from "../../schemas/account.model";
import type { Model } from "mongoose";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const friendList = await Account.getFriends(req.decoded["userid"]);

    return res.status(200).send({
      success: true,
      result: friendList,
    });
  } catch (e: any) {
    console.error(e);
    return res.status(500).send({
      name: e.name,
      message: e,
    });
  }

  // const friend = await Account.findById(req.decoded["userid"]).exec();
  // return res.status(200).send({
  //   success: true,
  //   result: await friend.getFriends(),
  // });
});

export default router;
