import { Session, InMemorySessionStore } from "./sessionStore";
import type { Server, Socket, Namespace } from "socket.io";
import type { DefaultEventsMap } from "socket.io/dist/typed-events";
import ChatModel from "../../schemas/chat.model"; // Room, // MessageContent, // Message,
import { IAccount } from "../../schemas/account.model";
import { IChatRoom, IMessage } from "../../schemas/chat.model";

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

interface CreateRoomRequest extends SocketRequest {
  name: IChatRoom["name"];
  userIDs: IChatRoom["userIDs"];
}

interface CreateRoomResponse extends SocketResponse {
  id: IChatRoom["_id"];
}

interface JoinRoomRequest extends SocketRequest {
  id: IChatRoom["_id"];
}

interface JoinRoomResponse extends SocketResponse {
  userID: IAccount["_id"];
  socketID: string;
}

interface ChatRequest extends SocketRequest {
  roomID: IChatRoom["_id"];
  content: IMessage["payload"];
}

type ChatResponse = IMessage;

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

    // update session
    session = sessionStore.findSession(socket.data.userID);
    // Event Handlers

    // Create New Room
    socket.on(ChatEvent.CreateRoom, async (req: CreateRoomRequest) => {
      const room = await ChatModel.createChatRoom({
        name: req.name,
        userIDs: req.userIDs,
      });

      socket.join(room._id.toString());

      console.log(
        `New room created by ${socket.data.userID}: ${room._id} (${room.name})`
      );

      // Request user to join the room
      for (const userID of room.userIDs) {
        const userSession = sessionStore.findSession(userID);
        console.log(
          `User ${userID} is ${
            userSession?.connected ? "connected" : "disconnected"
          }`
        );
        console.log(`userSession: ${userSession}`);
        if (
          userSession === undefined || // Case: User to invite is never connected before
          userSession.connected === false // Case: User to invite is not connected currently but was connected before
        ) {
          // TODO: Register the room to the user's account
          addPendingEvent(userID, ChatEvent.CreateRoom, room._id);
        } else {
          const res: CreateRoomResponse = {
            id: room._id,
          };
          socket.to(userID).emit(ChatEvent.CreateRoom, res);
        }
      }
    });

    // Event: Join Room
    // Called only when client emits "join_room" event
    socket.on(ChatEvent.JoinRoom, async ({ id }: JoinRoomRequest) => {
      const room = await ChatModel.findById(id).exec();
      // room.populate("users").populate("messages").exec();
      if (room === null) {
        // TODO: Handle Error: Room not found
      } else {
        // TODO: check if the user belongs to the room
        // room.users
        socket.join(id.toString());

        // const session = sessionStore.findSession(socket.data.userID);
        // if (session === undefined) throw new Error("Session not found");

        sessionStore.saveSession(socket.data.userID, {
          ...session,
          roomIDs: new Set([id.toString(), ...session.roomIDs]),
        });
        // Announce that new user is joined to the room
        const res: JoinRoomResponse = {
          userID: socket.data.userID,
          socketID: socket.id,
        };
        nsp.in(id.toString()).emit(ChatEvent.JoinRoom, res);
      }
    });

    // Event: Invite Room
    socket.on(ChatEvent.InviteRoom, async ({ roomID, users }) => {
      // TODO: Handle this case
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
