import express from "express";
import Account from "@/schemas/account.model";
import { verifyToken } from "@/middlewares/verifyToken";

const router = express.Router();

router.get("/", verifyToken, async function (req, res, next) {
  const userid = req.decoded["userid"];

  try {
    const account = await Account.findById(userid).exec();
    return res.status(200).json(await account.getFriends());
  } catch (e) {
    console.error(e);
    next(e);
  }
});

export default router;
