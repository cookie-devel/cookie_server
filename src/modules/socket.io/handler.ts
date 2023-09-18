import { InMemorySessionStore } from "./sessionStore";
import type { Server, Socket, Namespace } from "socket.io";
import type { DefaultEventsMap } from "socket.io/dist/typed-events";
import ChatModel, { Message, MessageContent, Room } from "../../schemas/chat.model";

const sessionStore = new InMemorySessionStore();

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

const joinRoom = (socket: Socket, roomID: string) => {
  socket.join(roomID);

  const session = sessionStore.findSession(socket.data.userID);
  if (session === undefined) throw new Error("Session not found");

  sessionStore.saveSession(socket.data.userID, {
    ...session,
    roomIDs: new Set([roomID, ...session.roomIDs]),
  });
};

export default (
  nsp: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  nsp.on("connection", (socket: Socket) => {
    console.log(
      `${socket.data.userID} (${socket.data.userName}) connected to chatHandler Namespace (socketid: ${socket.id})`
    );

    // SESSION
    // find existing session
    let session = sessionStore.findSession(socket.data.userID);

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
    socket.on("new_room", async (roomInfo: Room) => {
      const room = await ChatModel.createChatRoom(roomInfo);
      socket.join(room._id);

      console.log(
        `New room created by ${socket.data.userID}: ${room._id} (${room.name})`
      );

      for (const user of roomInfo.users) {
        const userSession = sessionStore.findSession(user.id);
        if (
          userSession === undefined || // Case: User to invite is never connected before
          userSession.connected === false // Case: User to invite is not connected currently but was connected before
        ) {
          // TODO: Register the room to the user's account
          addPendingEvent(user.id, "new_room", room._id);
        } else socket.to(userSession.socketID).emit("new_room", room._id);
      }
    });

    // Join Room
    // Called only when client emits "join_room" event
    socket.on("join_room", async ({ roomID }) => {
      const room = await ChatModel.findChatRoomByID(roomID);
      if (room === null) {
        // TODO: check if the user belongs to the room
        joinRoom(socket, roomID);
      } else {
        // TODO: Handle Error: Room not found
      }
      // Announce that new user is joined to the room
      nsp.in(roomID).emit("join_room", {
        user: socket.data.userID,
        socketID: socket.id,
      });
    });

    socket.on("invite_room", async ({ roomID, users }) => {
      // TODO: Handle this case
    });

    socket.on("leave_room", ({ roomID }) => {
      const user = socket.data.userID;

      sessionStore.saveSession(socket.data.userID, {
        socketID: socket.id,
        roomIDs: session.roomIDs.filter((id) => id !== roomID),
        connected: true,
      });

      socket.leave(roomID);
      nsp.in(roomID).emit("leave_room", { roomID, user });
    });

    socket.on(
      "chat",
      ({ roomID, content }: { roomID: string; content: MessageContent }) => {
        const message: Message = {
          payload: content,
          time: new Date(),
          sender: socket.data.userID,
        };

        console.log(
          `New message from ${socket.data.userID} in ${roomID} from ${socket.data.userID}: ${content.content} (${message.time})`
        );
        nsp.in(roomID).emit("chat", message);
      }
    );

    // Disconnection
    socket.on("disconnect", async () => {
      console.log("user disconnected");
      const matchingSockets = await nsp.in(socket.data.userID).fetchSockets();
      const isDisconnected = matchingSockets.length === 0;

      if (isDisconnected) {
        // notify other users
        socket.broadcast.emit("user disconnected", socket.data.userID);
        // update the connection status of the session
        sessionStore.saveSession(socket.data.userID, {
          socketID: socket.id,
          roomIDs: session.roomIDs,
          connected: false,
        });
        console.log(sessionStore.sessions);
      }
    });
  });
};
