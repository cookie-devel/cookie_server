export default (io) => {
  io.on("connection", (socket) => {
    console.log(`a user connected ${socket.id}`);
    socket.on("chat message", chatHandler);

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });
}

const chatHandler = (io) => {
  io.emit("chat message", msg);
}
