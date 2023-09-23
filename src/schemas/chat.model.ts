import mongoose, { InferSchemaType, Schema } from "mongoose";
import { AccountSchema } from "./account.model";

const MessageSchema = new Schema({
  _id: {
    type: String,
  },
  sender: {
    type: String,
    required: true,
    ref: "Account",
  },
  time: {
    type: Date,
    required: true,
  },
  payload: {
    type: Object,
    required: true,
  },
});

const ChatRoomSchema = new Schema(
  {
    _id: {
      type: String,
    },
    name: {
      type: String,
      default: "New Chat Room",
    },
    userIDs: [
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
        // ref: "Message",
      },
    ],
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
      async createChatRoom({ name, users }) {
        const _room = new this({
          name: name,
          users: users,
          messages: [],
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
      }
    },
    methods: {
      async addChat(message) {
        this.messages.push(message);
      },
    },
  }
);

export type IChatRoom = InferSchemaType<typeof ChatRoomSchema>;
export type IMessage = InferSchemaType<typeof MessageSchema>;
export default mongoose.model("Chat", ChatRoomSchema);
