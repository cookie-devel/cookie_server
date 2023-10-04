// Deprecated API

import express, { Request, Response, NextFunction } from "express";
import Joi from "joi";
import ChatRoomModel from "@/schemas/chat/room.model";
import { verifyToken } from "@/middlewares/jwt/verifyToken";

const router = express.Router();

const schema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  members: Joi.array().min(2).items(Joi.string().required()).required(),
});

const validate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.validateAsync(req.body);
  } catch (e: any) {
    return res.status(400).json({ message: e.message });
  }
  next();
};

router.post("/", validate, verifyToken, async function (req, res, next) {
  const id = req.decoded.userid;
  const room = await ChatRoomModel.createChatRoom({
    name: req.body.name,
    members: req.body.members,
  });

  const roomId = room._id.toString();

  console.log(`New room created by ${id}: ${roomId} (${room.name})`);

  return res.status(201).json({
    id: roomId,
    name: room.name,
    createdAt: room.createdAt,
    members: room.members,
  });
});

export default router;
