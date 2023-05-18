import { verifySocketToken } from "../../middlewares/jwt/verifyToken";
import jwt from "jsonwebtoken";
import { InMemorySessionStore } from "./sessionStore";
import type { Server, Socket } from "socket.io";
import type { DefaultEventsMap } from "socket.io/dist/typed-events";
import { ExtendedError } from "socket.io/dist/namespace";
const sessionStore = new InMemorySessionStore();

// interface ExtendedSocket extends Socket {
//   sessionID: string;
//   userID: string;
//   username: string;
//   decoded?: any;
// }

export default (
  io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  io.use((socket, next) => {
    // Authentication
    if (socket.handshake.auth && socket.handshake.auth.token) {
      jwt.verify(
        socket.handshake.auth.token,
        process.env.JWT_SECRET_KEY!,
        (err, decoded) => {
          if (err) return next(new Error("Authentication error"));
          socket.data.decoded = decoded;
          next();
        }
      );
    } else next(new Error("Authentication error"));

    // Session
    const sessionID = socket.handshake.auth.sessionID;
    if (!sessionID) {
      const session = sessionStore.findSession(sessionID);
      if (session) {
        socket.data.sessionID = sessionID;
        socket.data.userID = session.userID;
        socket.data.username = session.username;
        return next();
      }
    }

    // UserName
    const username = socket.handshake.auth.username;
    // console.log(socket.handshake.auth);
    if (!username) {
      console.log("invalid username");
      return next(new Error("invalid username"));
    }
    // console.log(socket);
    socket.data.sessionID = io.engine.generateId(null);
    socket.data.userID = io.engine.generateId(null);
    socket.data.username = username;
    next();
  });

  io.on("connection", (socket: Socket) => {
    console.log(`a user connected ${socket.id}`);

    // Session
    sessionStore.saveSession(socket.data.sessionID, {
      userID: socket.data.userID,
      username: socket.data.username,
      connected: true,
    });

    socket.emit("session", {
      sessionID: socket.data.sessionID,
      userID: socket.data.userID,
    });

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
    socket.on("private message", privateMessageHandler);
    socket.on("chat message", (msg) => {
      io.emit("chat message", msg);
    });

    // Disconnection
    socket.on("disconnect", disconnectHandler);
  });
};

const privateMessageHandler = (socket, { content, to }) => {
  socket.to(to).to(socket.data.userID).emit("private message", {
    content,
    from: socket.data.userID,
    to,
  });
};

const disconnectHandler = async () => {
  console.log("user disconnected");
  // const matchingSockets = await io.in(socket.userID).allSockets();
  // const isDisconnected = matchingSockets.size === 0;
  // if (isDisconnected) {
  //   socket.broadcast.emit("user disconnected", socket.userID);
  //   // update the connection status of the session
  //   sessionStore.saveSession(socket.sessionID, {
  //     userID: socket.userID,
  //     username: socket.username,
  //     connected: false,
  //   });
  // }
};
