import { IAccount } from "@/schemas/account.model";
import { IChatRoom } from "@/schemas/chat/room.model";
import { IMessage } from "@/schemas/chat/message.model";

export const ChatEvents = {
  CreateRoom: "create_room",
  JoinRoom: "join_room",
  InviteRoom: "invite_room",
  LeaveRoom: "leave_room",
  Chat: "chat",
};
Object.freeze(ChatEvents);

export interface SocketRequest {}
export interface SocketResponse {}

export interface CreateRoomRequest extends SocketRequest {
  name: IChatRoom["name"];
  members: IChatRoom["members"];
}

export interface CreateRoomResponse extends SocketResponse {
  id: string;
  name: IChatRoom["name"];
  createdAt: IChatRoom["createdAt"];
  members: IChatRoom["members"];
}

export type JoinRoomRequest = string;
export type JoinRoomResponse = CreateRoomResponse;

export interface ChatRequest extends SocketRequest {
  room: string;
  payload: IMessage["content"];
}

export interface ChatResponse extends SocketResponse {
  room: string;
  sender: IAccount["_id"];
  timestamp: IMessage["time"];
  payload: IMessage["content"];
}
