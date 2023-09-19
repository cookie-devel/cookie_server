import { Session, InMemorySessionStore } from "./sessionStore";
import type { Server, Socket, Namespace } from "socket.io";
import type { DefaultEventsMap } from "socket.io/dist/typed-events";
import ChatModel, {
  Message,
  MessageContent,
  Room,
} from "../../schemas/chat.model";
import { User } from "../../schemas/account.model";

const ChatEvent = {
  NewRoom: "new_room",
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
  name: Room["name"];
  users: Room["users"];
}

interface NewRoomResponse extends SocketResponse {
  id: Room["_id"];
}

interface JoinRoomRequest extends SocketRequest {
  id: Room["_id"];
}

interface JoinRoomResponse extends SocketResponse {
  userID: User["id"];
  socketID: string;
}

interface ChatRequest extends SocketRequest {
  roomID: Room["_id"];
  content: MessageContent;
}

type ChatResponse = Message;

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
    socket.on(ChatEvent.NewRoom, async (req: NewRoomRequest) => {
      const room = await ChatModel.createChatRoom({
        name: req.name,
        users: req.users,
      });
      socket.join(room._id);

      console.log(
        `New room created by ${socket.data.userID}: ${room._id} (${room.name})`
      );

      // Request user to join the room
      for (const user of room.users) {
        const userSession = sessionStore.findSession(user.id);

        if (
          userSession === undefined || // Case: User to invite is never connected before
          userSession.connected === false // Case: User to invite is not connected currently but was connected before
        ) {
          // TODO: Register the room to the user's account
          addPendingEvent(user.id, ChatEvent.NewRoom, room._id);
        } else {
          const res: NewRoomResponse = {
            id: room._id,
          };
          socket.to(userSession.socketID).emit(ChatEvent.NewRoom, res);
        }
      }
    });

    // Event: Join Room
    // Called only when client emits "join_room" event
    socket.on(ChatEvent.JoinRoom, async ({ id }: JoinRoomRequest) => {
      const room = await ChatModel.findChatRoomByID(id);
      if (room === null) {
        // TODO: Handle Error: Room not found
      } else {
        // TODO: check if the user belongs to the room
        // room.users
        socket.join(id);

        // const session = sessionStore.findSession(socket.data.userID);
        // if (session === undefined) throw new Error("Session not found");

        sessionStore.saveSession(socket.data.userID, {
          ...session,
          roomIDs: new Set([id, ...session.roomIDs]),
        });
        // Announce that new user is joined to the room
        const res: JoinRoomResponse = {
          userID: socket.data.userID,
          socketID: socket.id,
        };
        nsp.in(id).emit(ChatEvent.JoinRoom, res);
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
      nsp.in(roomID).emit(ChatEvent.LeaveRoom, { roomID, user });
    });

    // Event: Chat 
    socket.on(ChatEvent.Chat, ({ roomID, content }: ChatRequest) => {
      const message: ChatResponse = {
        payload: content,
        time: new Date(),
        sender: socket.data.userID,
      };

      ChatModel.addChat(roomID, message);
      nsp.in(roomID).emit(ChatEvent.Chat, message);

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
