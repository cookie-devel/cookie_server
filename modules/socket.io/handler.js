import { InMemorySessionStore } from "./sessionStore.js"

export default (io) => {
  io.use((socket, next) => {
    const sessionID = socket.handshake.auth.sessionID;
    if (sessionID) {
      const session = sessionStore.findSession(sessionID);
      if (session) {
        socket.sessionID = sessionID;
        socket.userID = session.userID;
        socket.username = session.username;

        return next();
      }

      const username = socket.handshake.auth.username;
      if (!username) {
        return next(new Error("invalid username"));
      }
      socket.sessionID = io.engine.generateId();
      socket.userID = io.engine.generateId();
      socket.username = username;
    }
  })

  io.on("connection", (socket) => {
    console.log(`a user connected ${socket.id}`);

    sessionStore.saveSession(socket.sessionID, {
      userID: socket.userID,
      username: socket.username,
      connected: true,
    })

    socket.emit("session", {
      sessionID: socket.sessionID,
      userID: socket.userID,
    })

    socket.join(socket.userID);

    socket.on("chat message", chatHandler);

    socket.on("disconnect", async () => {
      console.log("user disconnected");
      const matchingSockets = await io.in(socket.userID).allSockets();
      const isDisconnected = matchingSockets.size === 0;
      if (isDisconnected) {
        socket.broadcast.emit("user disconnected", socket.userID);
        sessionStore.saveSession(socket.sessionID, {
          userID: socket.userID,
          username: socket.username,
          connected: false,
        })
      }
    });
  });
}

const chatHandler = (io) => {
  io.emit("chat message", msg);
}
