import { InMemorySessionStore } from "./sessionStore.js";
const sessionStore = new InMemorySessionStore();

export default (io) => {
  io.use((socket, next) => {
    // Session
    const sessionID = socket.handshake.auth.sessionID;
    if (!sessionID) {
      const session = sessionStore.findSession(sessionID);
      if (session) {
        socket.sessionID = sessionID;
        socket.userID = session.userID;
        socket.username = session.username;
        return next();
      }
    }

    // UserName
    const username = socket.handshake.auth.username;
    console.log(socket.handshake.auth);
    if (!username) {
      console.log("invalid username");
      return next(new Error("invalid username"));
    }
    console.log(socket);
    socket.sessionID = io.engine.generateId();
    socket.userID = io.engine.generateId();
    socket.username = username;
    next();
  });

  io.on("connection", (socket) => {
    console.log(`a user connected ${socket.id}`);

    // Session
    sessionStore.saveSession(socket.sessionID, {
      userID: socket.userID,
      username: socket.username,
      connected: true,
    });

    socket.emit("session", {
      sessionID: socket.sessionID,
      userID: socket.userID,
    });

    // Join Chatroom
    socket.join(socket.userID);

    // Fetch Users
    const users = [];
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
      userID: socket.userID,
      username: socket.username,
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

const privateMessageHandler = ({ content, to }) => {
  socket.to(to).to(socket.userID).emit("private message", {
    content,
    from: socket.userID,
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
