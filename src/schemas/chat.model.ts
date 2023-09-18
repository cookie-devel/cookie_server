import mongoose, { Model } from "mongoose";
import { User } from "./account.model";

export interface MessageContent {
  content: string;
}

export interface Message {
  sender: User;
  payload: MessageContent;
  time: Date;
}

export interface Room {
  id: string | null;
  name: string;
  users: User[];
  messages: Message[];
}

const chatSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "New Chat Room",
    },
    users: [
      {
        type: Object,
        ref: "Account",
      },
    ],
    messages: [
      {
        type: Object,
        ref: "Message",
      },
    ],
  },
  {
    collection: "chats",
    timestamps: true,
  }
);

chatSchema.statics.createChatRoom = async function (room: Room) {
  const _room = await new this({
    name: room.name,
    users: room.users,
    messages: [],
  });

  try {
    await _room.save();
    return _room;
  } catch (err) {
    throw err;
  }
};

chatSchema.statics.checkChatRoomExists = async function (roomID: string) {
  return this.exists({ _id: roomID });
};

chatSchema.statics.findChatRoomByID = async function (roomID: string) {
  return this.findById(roomID).populate("users").populate("messages").exec();
};

chatSchema.statics.addChatToRoom = async function (
  roomID: string,
  message: Message
) {
  const room = await this.findById(roomID);
  if (room === null) throw new Error("Room not found");
  room.messages.push(message);
  await room.save();
};

chatSchema.methods.addChat = async function (message: Message) {
  this.messages.push(message);
};

// methods
interface IChatDocument {
  addChat: typeof chatSchema.methods.addChat;
}

// statics
interface IChatModel extends mongoose.Model<IChatDocument> {
  createChatRoom: typeof chatSchema.statics.createChatRoom;
  checkChatRoomExists: typeof chatSchema.statics.checkChatRoomExists;
  findChatRoomByID: typeof chatSchema.statics.findChatRoomByID;
  addChatToRoom: typeof chatSchema.statics.addChatToRoom;
}

const Chat: IChatModel = mongoose.model<IChatDocument, IChatModel>(
  "Chat",
  chatSchema
);

// export default mongoose.model("Chat", chatSchema);
export default Chat;
