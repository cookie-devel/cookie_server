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
  _id: string;
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

chatSchema.statics.createChatRoom = async function ({ name, users }) {
  const _room = await new this({
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
};

chatSchema.statics.checkChatRoomExists = async function (roomID: string) {
  return this.exists({ _id: roomID });
};

chatSchema.statics.findChatRoomByID = async function (roomID: string) {
  return this.findById(roomID).populate("users").populate("messages").exec();
};

chatSchema.statics.addChat = async function (roomID: string, message: Message) {
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
  addChat: (message: Message) => Promise<void>;
}

// statics
interface IChatModel extends mongoose.Model<IChatDocument> {
  createChatRoom: ({
    name,
    users,
  }: {
    name: Room["name"];
    users: Room["users"];
  }) => Promise<Room>;
  checkChatRoomExists: (roomID: string) => Promise<boolean>;
  findChatRoomByID: (roomID: string) => Promise<Room | null>;
  addChat: (roomID: string, message: Message) => Promise<void>;
}

const Chat: IChatModel = mongoose.model<IChatDocument, IChatModel>(
  "Chat",
  chatSchema
);

// export default mongoose.model("Chat", chatSchema);
export default Chat;
