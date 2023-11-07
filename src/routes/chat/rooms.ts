import Account from "@/schemas/account.model";
import { verifyToken } from "@/middlewares/jwt/verifyToken";
import { Router } from "express";

const router = Router();

router.get("/", verifyToken, async (req, res, next) => {
  const userid = req.decoded["userid"];

  try {
    const account = await Account.findById(userid).exec();
    const json = {
      chatRoomList: await account.getChatRooms(),
    };

    return res.status(200).json(json);
  } catch (e) {
    console.error(e);
    return res.status(500).send({ message: "Internal Server Error" });
  }
});

export default router;
