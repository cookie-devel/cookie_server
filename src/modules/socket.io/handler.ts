import { verifySocketToken } from "../../middlewares/jwt/verifyToken";
import jwt from "jsonwebtoken";
import { InMemorySessionStore } from "./sessionStore";
import type { Server, Socket } from "socket.io";
import type { DefaultEventsMap } from "socket.io/dist/typed-events";
import { ExtendedError } from "socket.io/dist/namespace";
const sessionStore = new InMemorySessionStore();

export default (
  io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  // Handshake JWT Authentication
  io.use((socket, next) => {
    // Authentication
    if (socket.handshake.auth && socket.handshake.auth.token) {
      jwt.verify(
        socket.handshake.auth.token,
        process.env.JWT_SECRET_KEY!,
        (err, decoded) => {
          if (err || !decoded) return next(new Error("Authentication error"));
          if (!decoded["userid"] || !decoded["username"])
            return next(new Error("Invalid Token"));
          socket.data.userID = decoded["userid"];
          socket.data.userName = decoded["username"];
          next();
        }
      );
    } else next(new Error("Authentication error"));
  });

  io.on("connection", (socket: Socket) => {
    console.log(
      `${socket.data.userID}(${socket.data.userName}) connected (socketid: ${socket.id})`
    );

    // Join Chatroom
    socket.join(socket.data.userID);

    // Fetch Users
    const users: Array<{
      userID: string;
      username: string;
      connected: string;
    }> = [];
    sessionStore.findAllSessions().forEach((session) => {
      users.push({
        userID: session.userID,
        username: session.username,
        connected: session.connected,
      });
    });
    socket.emit("users", users);

    // notify existing users
    socket.broadcast.emit("user connected", {
      userID: socket.data.userID,
      username: socket.data.username,
      connected: true,
    });

    // forward the private message to the right recipient
    socket.on("private message", (socket, { content, to }) => {
      socket.to(to).to(socket.data.userID).emit("private message", {
        content,
        from: socket.data.userID,
        to,
      });
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
          connected: false,
        });
        console.log(sessionStore.sessions);
      }
    });
  });
};
