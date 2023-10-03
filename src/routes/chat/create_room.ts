import express, { Request, Response, NextFunction } from "express";
import Joi from "joi";
import ChatRoomModel from "@/schemas/chat/room.model";
import { verifyToken } from "@/middlewares/jwt/verifyToken";

const router = express.Router();

const schema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  members: Joi.array().items(Joi.string().required()).min(2).required(),
});

const validate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.validateAsync(req.body);
  } catch (e: any) {}
  next();
};

router.post("/", validate, verifyToken, async function (req, res, next) {
  const id = req.decoded.userid;
  // const room = await ChatModel.createChatRoom({
  //   name: req.body.name,
  //   members: req.body.members,
  // });

  const room = await ChatRoomModel.create({
    name: req.body.name,
    members: req.body.members,
  });

  const roomId = room._id.toString();

  console.log(`New room created by ${id}: ${roomId} (${room.name})`);

  res.status(201).json({
    id: roomId,
    name: room.name,
    createdAt: room.createdAt,
    members: room.members,
  });
});

export default router;
