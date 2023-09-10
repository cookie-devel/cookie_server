import { InMemorySessionStore } from "./sessionStore";
import type { Room } from "../../interfaces/Chat";
import type { Server, Socket, Namespace } from "socket.io";
import type { DefaultEventsMap } from "socket.io/dist/typed-events";
const sessionStore = new InMemorySessionStore();

export default (
io: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  io.on("connection", (socket: Socket) => {
    console.log(
      `${socket.data.userID}(${socket.data.userName}) connected to chatHandler Namespace (socketid: ${socket.id})`
    );

    // Join Chatroom
    socket.join(socket.data.userID);

    // Fetch Users
    const users: Array<{
      userID: string;
      username: string;
      rooms: string[];
      connected: string;
    }> = [];

    sessionStore.findAllSessions().forEach((session) => {
      users.push({
        userID: session.userID,
        username: session.username,
        rooms: session.rooms,
        connected: session.connected,
      });
    });
    // socket.emit("users", users);

    socket.on("new_room", (roomInfo: Room) => {
      const { id, users } = roomInfo;
      console.log(`user ${socket.data.userID} emitted new_room: ${id}`);
      socket.join(id);

      for (const user of users) {
        // TODO: find socketID from userID
        const socketID = 'testid1'
        socket.to(socketID).emit("new_room", roomInfo);
      }
      socket.broadcast.emit("new_room", roomInfo);
    });

    socket.on("join_room", ({ roomID, users }) => {
      socket.to(roomID).emit("join_room", { roomID, users });
    });

    socket.on("leave_room", ({ roomID }) => {
      const user = socket.data.userID;
      socket.leave(roomID);
      io.in(roomID).emit("leave_room", { roomID, user });
    });

    socket.on("chat", ({ roomID, content }) => {
      const message = {
        content,
        time: new Date(),
        from: socket.data.userID,
      };

      io.in(roomID).emit("chat", message);
    });

    // Disconnection
    socket.on("disconnect", async () => {
      console.log("user disconnected");
      const matchingSockets = await io.in(socket.data.userID).fetchSockets();
      const isDisconnected = matchingSockets.length === 0;

      if (isDisconnected) {
        // notify other users
        socket.broadcast.emit("user disconnected", socket.data.userID);
        // update the connection status of the session
        sessionStore.saveSession(socket.data.userID, {
          userID: socket.data.userID,
          username: socket.data.username,
          rooms: socket.data.rooms,
          connected: false,
        });
        console.log(sessionStore.sessions);
      }
    });
  });
};
