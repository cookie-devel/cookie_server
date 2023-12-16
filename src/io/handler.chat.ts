import { Session, InMemorySessionStore } from "./sessionStore";
import type { Socket, Namespace } from "socket.io";
import type { DefaultEventsMap } from "socket.io/dist/typed-events";
import ChatModel from "@/schemas/chatroom.model";
import * as ChatType from "@/interfaces/chat";
import { ChatEvents } from "@/interfaces/chat";
import Account from "@/schemas/account.model";
import { getMessaging } from "firebase-admin/messaging";
import { sendPush, sendChat } from "@/utils/push";

interface ChatSession extends Session {
  pendingEvents: { event: string; data: any }[];
}

const sessionStore = new InMemorySessionStore<ChatSession>();

const addPendingEvent = (userid: string, event: string, data: any) => {
  const session = sessionStore.findSession(userid) || {
    socketID: null,
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
      `[CHAT] ${socket.data.userID} (${socket.data.userName}) connected to chatHandler Namespace (socketid: ${socket.id})`
    );

    // Initialization
    socket.join(socket.data.userID);
    console.log(`[CHAT] Joined to ${socket.data.userID}`);

    const account = await Account.findById(socket.data.userID).exec();
    if (account === null) throw new Error("Account not found");
    console.log("[CHAT] Joined User's Account");
    console.log(account);

    // SESSION
    // find existing session
    let session = sessionStore.findSession(socket.data.userID);
    const getSession = () => sessionStore.findSession(socket.data.userID);

    console.log(`[CHAT] ${socket.data.userID}'s Session Information`);
    console.log(getSession());

    // TODO: Handle Pending Events
    if (session !== undefined) {
      for (const pendingEvent of session.pendingEvents) {
        socket.emit(pendingEvent.event, pendingEvent.data);
      }
    }

    // register the session to the session store
    session = sessionStore.saveSession(socket.data.userID, {
      socketID: socket.id,
      pendingEvents: [],
      connected: true,
    });

    console.log(`[CHAT] ${socket.data.userID}'s Session Information`);
    console.log(getSession());

    // Join Existing Rooms
    console.log(`[CHAT] Joining Existing Rooms`);
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

    // Event Handlers
    // Create New Room
    socket.on(
      ChatEvents.CreateRoom,
      async (req: ChatType.CreateRoomRequest) => {
        console.log(`[CHAT] create_room event received`);
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
            `[CHAT] [create_room] New room created by ${socket.data.userID}: ${roomId} (${room.name})`
          );

          // Request connected user to join the room via invite_room event
          // If the user is not connected, when initializing user will join the room based on DB roomIDs
          for (const userID of req.members) {
            if (sessionStore.findSession(userID)?.connected) {
              nsp.to(userID).emit(ChatEvents.InviteRoom, roomId);
            }

            Account.findById(userID)
              .exec()
              .then((account) => {
                account.addChatRoom(roomId);
              });
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
        `[CHAT] [join_room] ${socket.data.userID} is trying to join ${id}`
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
    socket.on(ChatEvents.LeaveRoom, async (roomID) => {
      const user = socket.data.userID;

      // Leave the room
      await socket.leave(roomID);

      // Remove room from the user's account
      const account = await Account.findById(socket.data.userID).exec();
      account.chatRoomIDs = account.chatRoomIDs.filter(
        (id) => id.toString() !== roomID.toString()
      );
      await account.save();

      // Emit LeaveRoom event to the room
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
          const message: ChatType.ChatResponse = {
            roomId: roomId,
            payload: payload,
            timestamp: new Date(),
            sender: socket.data.userID,
          };
          // User is in the room
          await room.addChat(message);

          // Message Type
          // const Message({
          //   required this.author,
          //   this.createdAt,
          //   required this.id,
          //   this.metadata,
          //   this.remoteId,
          //   this.repliedMessage,
          //   this.roomId,
          //   this.showStatus,
          //   this.status,
          //   required this.type,
          //   this.updatedAt,
          // });

          // const tokens: string[] = (
          //   (
          //     await Account.find({
          //       _id: { $in: room.members },
          //     })
          //       .populate("deviceTokens")
          //       .select("deviceTokens")
          //       .exec()
          //   )
          //     .map((account) => account.deviceTokens)
          //     .flat() as any
          // ).map((token) => token.token);
          //
          // sendPush(tokens, {
          //   groupKey: roomId,
          //   title: room.name,
          //   subtitle: user,
          //   body: payload.text,
          // });

          sendChat(room, {
            groupKey: roomId,
            title: room.name,
            subtitle: user,
            body: payload.text,
          });

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
          pendingEvents: [],
          connected: false,
        });
        console.log(sessionStore.sessions);
      }
    });
  });
};
