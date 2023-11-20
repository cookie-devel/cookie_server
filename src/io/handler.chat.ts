import { Session, InMemorySessionStore } from "./sessionStore";
import type { Socket, Namespace } from "socket.io";
import type { DefaultEventsMap } from "socket.io/dist/typed-events";
import ChatModel from "@/schemas/chatroom.model";
import * as ChatType from "@/interfaces/chat";
import { ChatEvents } from "@/interfaces/chat";
import Account from "@/schemas/account.model";

interface ChatSession extends Session {
  roomIDs: Set<string>;
  pendingEvents: { event: string; data: any }[];
}

const sessionStore = new InMemorySessionStore<ChatSession>();

const addPendingEvent = (userid: string, event: string, data: any) => {
  const session = sessionStore.findSession(userid) || {
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
  nsp.on("connection", async (socket: Socket) => {
    console.log(
      `${socket.data.userID} (${socket.data.userName}) connected to chatHandler Namespace (socketid: ${socket.id})`
    );

    socket.join(socket.data.userID);
    console.log(`Joined to ${socket.data.userID}`);

    // Initialization
    const account = await Account.findById(socket.data.userID).exec();
    if (account === null) throw new Error("Account not found");
    console.log(account);

    // Join all registered chat rooms
    // account.chatRoomIDs.forEach((roomID) => {
    //   socket.join(roomID.toString());
    //   console.log(`Joined to ${roomID}`);
    // });
    //
    account.chatRoomIDs.forEach(async (roomID) => {
      const room = await ChatModel.findById(roomID).exec();
      const res: ChatType.JoinRoomResponse = {
        id: roomID.toString(),
        name: room.name,
        createdAt: room.createdAt,
        members: room.members,
        messages: room.messages,
      };
      socket.join(roomID.toString());
      socket.emit(ChatEvents.JoinRoom, res);
    });
    // socket.join(account.chatRoomIDs.map((roomID) => roomID.toString()));

    // SESSION
    // find existing session
    let session: ChatSession = sessionStore.findSession(socket.data.userID);

    // TODO: Handle Pending Events
    if (session !== undefined) {
      for (const pendingEvent of session.pendingEvents) {
        socket.emit(pendingEvent.event, pendingEvent.data);
        // socket.dispatchEvent(pendingEvent.event, pendingEvent.data);
      }
      session.pendingEvents = [];
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
    socket.on(
      ChatEvents.CreateRoom,
      async (req: ChatType.CreateRoomRequest) => {
        console.log({ req });
        // Create Room
        try {
          const room = await ChatModel.insert({
            name: req.name,
            members: [socket.data.userID, ...req.members],
          });
          const roomId = room._id.toString();

          // Make room manager join the room
          account.addChatRoom(roomId);
          await socket.join(roomId);

          // Tell the room manager that the room is created successfully
          const res: ChatType.CreateRoomResponse = {
            id: roomId,
            name: room.name,
            createdAt: room.createdAt,
            members: room.members,
            messages: room.messages,
          };
          nsp.to(socket.data.userID).emit(ChatEvents.CreateRoom, res);

          console.log(
            `New room created by ${socket.data.userID}: ${roomId} (${room.name})`
          );

          // Request user to join the room via invite_room event
          for (const userID of req.members) {
            console.log(`User ${userID} is invited to ${roomId}`);
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
              addPendingEvent(userID, ChatEvents.InviteRoom, roomId);
            } else {
              // Case: User to invite is currently connected
              nsp.to(userID).emit(ChatEvents.InviteRoom, roomId);
            }
          }
        } catch (err) {
          console.error(err);
          socket.emit("error", err);
        }
      }
    );

    // Event: Join Room
    // Called only when client emits "join_room" event
    socket.on(ChatEvents.JoinRoom, async (id: ChatType.JoinRoomRequest) => {
      console.group(
        `[join_room] ${socket.data.userID} is trying to join ${id}`
      );

      try {
        const room = await ChatModel.findById(id).exec();
        if (room === null) throw new Error(`Room ${id} not found`);
        else if (!room.members.includes(socket.data.userID))
          throw new Error(
            `User ${socket.data.userID} is not in the room ${id} (${room.name})`
          );

        account.addChatRoom(id);
        await socket.join(id);

        // const session = sessionStore.findSession(socket.data.userID);
        // if (session === undefined) throw new Error("Session not found");

        sessionStore.saveSession(socket.data.userID, {
          ...session,
          roomIDs: new Set([id.toString(), ...session.roomIDs]),
        });

        const res: ChatType.JoinRoomResponse = {
          id: id,
          name: room.name,
          createdAt: room.createdAt,
          members: room.members,
          messages: room.messages,
        };

        socket.emit(ChatEvents.JoinRoom, res);
      } catch (err) {
        console.error(err);
        socket.emit("error", err);
      } finally {
        console.groupEnd();
      }
      // TODO: Announce that new user is joined to the room
    });

    // Event: Leave Room
    socket.on(ChatEvents.LeaveRoom, async ({ roomID }) => {
      const user = socket.data.userID;

      const delResult = session.roomIDs.delete(roomID);
      if (!delResult) throw new Error("Room not found in session");

      sessionStore.saveSession(socket.data.userID, {
        socketID: socket.id,
        roomIDs: session.roomIDs,
        pendingEvents: [],
        connected: true,
      });

      await socket.leave(roomID);
      nsp
        .in(roomID.toString())
        .emit(ChatType.ChatEvents.LeaveRoom, { roomID, user });
    });

    // Event: Chat
    socket.on(
      ChatType.ChatEvents.Chat,
      async ({ roomId, payload }: ChatType.ChatRequest) => {
        console.log(`User ${socket.data.userID} sent a message to ${roomId}`);
        console.log(payload);
        // Check if the user is in the room,
        const user = socket.data.userID;
        try {
          const room = await ChatModel.findById(roomId).exec();

          if (room === null) throw new Error(`Room ${roomId} not found`);
          else if (!room.members.includes(user))
            throw new Error(
              `User ${user} is not in the room ${roomId} (${room.name})`
            );

          // User is in the room
          await room.addChat({
            content: payload,
            sender: socket.data.userID,
            time: new Date(),
          });

          const message: ChatType.ChatResponse = {
            roomId: roomId,
            payload: payload,
            timestamp: new Date(),
            sender: socket.data.userID,
          };

          nsp.in(roomId).emit(ChatType.ChatEvents.Chat, message);
          console.log(`Message sent to ${roomId}`);
        } catch (err) {
          console.error(err);
        }
      }
    );

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
