import { Session, InMemorySessionStore } from "./sessionStore";
import type { Server, Socket, Namespace } from "socket.io";
import type { DefaultEventsMap } from "socket.io/dist/typed-events";
import ChatModel, { IChatRoom } from "@/schemas/chat/room.model";
import MessageModel, { IMessage } from "@/schemas/chat/message.model";
import { IAccount } from "@/schemas/account.model";

const ChatEvent = {
  CreateRoom: "create_room",
  JoinRoom: "join_room",
  InviteRoom: "invite_room",
  LeaveRoom: "leave_room",
  Chat: "chat",
};
Object.freeze(ChatEvent);

interface ChatSession extends Session {
  roomIDs: Set<string>;
  pendingEvents: { event: string; data: any }[];
}

const sessionStore = new InMemorySessionStore<ChatSession>();

interface SocketRequest {}
interface SocketResponse {}

interface NewRoomRequest extends SocketRequest {
  name: IChatRoom["name"];
  members: IChatRoom["members"];
}

interface NewRoomResponse extends SocketResponse {
  id: string;
  name: IChatRoom["name"];
  createdAt: IChatRoom["createdAt"];
  members: IChatRoom["members"];
}

type JoinRoomRequest = string;

interface ChatRequest extends SocketRequest {
  roomID: IChatRoom["_id"];
  content: IMessage["payload"];
}

interface ChatResponse extends SocketResponse {
  sender: IAccount["_id"];
  time: IMessage["time"];
  payload: IMessage["payload"];
}

const addPendingEvent = (userid: string, event: string, data: any) => {
  let session = sessionStore.findSession(userid) || {
    socketID: null,
    roomIDs: new Set([]),
    pendingEvents: [],
    connected: false,
  };

  sessionStore.saveSession(userid, {
    ...session,
    pendingEvents: [
      ...session.pendingEvents,
      {
        event,
        data,
      },
    ],
  });
};

export default (
  nsp: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  nsp.on("connection", (socket: Socket) => {
    console.log(
      `${socket.data.userID} (${socket.data.userName}) connected to chatHandler Namespace (socketid: ${socket.id})`
    );

    socket.join(socket.data.userID);
    console.log(`Joined to ${socket.data.userID}`);

    // SESSION
    // find existing session
    let session: ChatSession = sessionStore.findSession(socket.data.userID);

    // TODO: Handle Pending Events
    if (session !== undefined) {
      for (const pendingEvent of session.pendingEvents) {
        // socket.dispatchEvent(pendingEvent.event, pendingEvent.data);
      }
    }

    // register the session to the session store
    sessionStore.saveSession(socket.data.userID, {
      socketID: socket.id,
      roomIDs: session ? session.roomIDs : new Set([]),
      pendingEvents: [],
      connected: true,
    });

    console.log(sessionStore.sessions);

    // update session
    session = sessionStore.findSession(socket.data.userID);
    // Event Handlers

    // Create New Room
    socket.on(ChatEvent.CreateRoom, async (req: NewRoomRequest) => {
      // Create Room
      const room = await ChatModel.createChatRoom({
        name: req.name,
        members: req.members,
      });

      const roomID = room._id.toString();

      // Make room manager join the room
      socket.join(roomID);
      const res: NewRoomResponse = {
        id: roomID,
        name: room.name,
        createdAt: room.createdAt,
        members: room.members,
      };
      nsp.to(socket.data.userID).emit(ChatEvent.CreateRoom, res);

      console.log(
        `New room created by ${socket.data.userID}: ${roomID} (${room.name})`
      );

      // Request user to join the room via invite_room event
      for (const userID of room.members) {
        const userSession = sessionStore.findSession(userID);
        console.log(
          `User ${userID} is ${
            userSession?.connected ? "connected" : "not connected"
          }`
        );
        if (userSession) console.log(`userSession: ${userSession}`);
        if (
          userSession === undefined || // Case: User to invite is never connected before
          userSession.connected === false // Case: User to invite is not connected currently but was connected before
        ) {
          // TODO: Register the room to the user's account
          addPendingEvent(userID, ChatEvent.InviteRoom, roomID);
        } else {
          // Case: User to invite is currently connected
          nsp.to(userID).emit(ChatEvent.InviteRoom, roomID);
        }
      }
    });

    // Event: Join Room
    // Called only when client emits "join_room" event
    socket.on(ChatEvent.JoinRoom, async (id: JoinRoomRequest) => {
      const room = await ChatModel.findById(id).exec();
      if (room === null) {
        console.log(`Room ${id} not found`);
        return;
      } else if (!room.members.includes(socket.data.userID)) {
        return;
      }

      console.log(`User ${socket.data.userID} exists in ${room.members}`);
      console.log(`User ${socket.data.userID} joined to room ${id}`);
      socket.join(id);
      // const session = sessionStore.findSession(socket.data.userID);
      // if (session === undefined) throw new Error("Session not found");

      sessionStore.saveSession(socket.data.userID, {
        ...session,
        roomIDs: new Set([id.toString(), ...session.roomIDs]),
      });
      const res: NewRoomResponse = {
        id: id,
        name: room.name,
        createdAt: room.createdAt,
        members: room.members,
      };
      socket.emit(ChatEvent.JoinRoom, res);
      // TODO: Announce that new user is joined to the room
    });

    // Event: Leave Room
    socket.on(ChatEvent.LeaveRoom, ({ roomID }) => {
      const user = socket.data.userID;

      const delResult = session.roomIDs.delete(roomID);
      if (!delResult) throw new Error("Room not found in session");

      sessionStore.saveSession(socket.data.userID, {
        socketID: socket.id,
        roomIDs: session.roomIDs,
        pendingEvents: [],
        connected: true,
      });

      socket.leave(roomID);
      nsp.in(roomID.toString()).emit(ChatEvent.LeaveRoom, { roomID, user });
    });

    // Event: Chat
    socket.on(ChatEvent.Chat, async ({ roomID, content }: ChatRequest) => {
      const message: ChatResponse = {
        payload: content,
        time: new Date(),
        sender: socket.data.userID,
      };
      const chatRoom = await ChatModel.findById(roomID).exec();

      chatRoom.addChat(message);
      nsp.in(roomID.toString()).emit(ChatEvent.Chat, message);

      console.log(
        `New message from ${socket.data.userID} to room ${roomID}: ${content.content} (${message.time})`
      );
    });

    // Disconnection
    socket.on("disconnect", async () => {
      console.log("user disconnected");
      const matchingSockets = await nsp.in(socket.data.userID).fetchSockets();
      const isDisconnected = matchingSockets.length === 0;

      if (isDisconnected) {
        // notify other users
        // socket.broadcast.emit("user disconnected", socket.data.userID);
        // update the connection status of the session
        sessionStore.saveSession(socket.data.userID, {
          socketID: socket.id,
          roomIDs: session.roomIDs,
          pendingEvents: [],
          connected: false,
        });
        console.log(sessionStore.sessions);
      }
    });
  });
};
