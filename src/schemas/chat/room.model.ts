import { ObjectId } from "mongodb";
import mongoose, { InferSchemaType, Schema } from "mongoose";
import { MessageSchema } from "@/schemas/chat/message.model";

const ChatRoomSchema = new Schema(
  {
    _id: {
      type: ObjectId,
      required: true,
      auto: true,
    },
    name: {
      type: String,
      default: "New Chat Room",
    },
    members: [
      {
        type: String,
        required: true,
        ref: "Account",
      },
    ],
    messages: [
      {
        type: MessageSchema,
        required: true,
      },
    ],
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: "chats",
    timestamps: true,
    query: {
      getPopulatedById(_id) {
        return this.findById(_id).populate("users").populate("messages").exec();
      },
    },
    statics: {
      async createChatRoom({ name, members }) {
        const _room = new this({
          name: name,
          members: members,
        });

        try {
          await _room.save();
          return _room;
        } catch (err) {
          throw err;
        }
      },
      async addChat(roomID, message) {
        const room = await this.findById(roomID);
        if (room === null) throw new Error("Room not found");
        room.messages.push(message);
        await room.save();
      },
      getPopulatedById(_id) {
        return this.findById(_id).populate("users").populate("messages").exec();
      },
    },
    methods: {
      async addChat(message) {
        this.messages.push(message);
      },
    },
  }
);

export type IChatRoom = InferSchemaType<typeof ChatRoomSchema>;
export default mongoose.model("Chat", ChatRoomSchema);
