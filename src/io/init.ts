import { Namespace, Server as SocketIOServer } from "socket.io";
import chatHandler from "@/modules/socket.io/handler";
import bcrypt from "bcrypt";
import { instrument } from "@socket.io/admin-ui";
import { verifySocketToken } from "@/middlewares/jwt/verifyToken";
import { chatNSP, locationNSP } from "@/index";
import locationHandler from "@/modules/socket.io/handler.location";

export const init = (io: SocketIOServer) => {
  const of = io.of;
  io.of = (...args) => {
    const nsp = of.call(io, ...args);
    nsp.use(verifySocketToken);
    return nsp;
  };
  const handle = (nsp, handler) => handler(nsp);

  // namespace handlers
  handle(chatNSP, chatHandler);
  handle(locationNSP, locationHandler);

  // Admin UI for Socket.IO
  instrument(io, {
    auth: {
      type: "basic",
      username: "parkjb",
      password: bcrypt.hashSync(process.env.SOCKETIO_PW_HASH_KEY!, 10),
    },
    namespaceName: "/admin",
    mode: "development",
  });
};