import { Namespace, Server as SocketIOServer } from "socket.io";
import chatHandler from "@/modules/socket.io/handler";
import bcrypto from "bcryptjs";
import { instrument } from "@socket.io/admin-ui";
import { verifySocketToken } from "@/middlewares/jwt/verifyToken";
import { chatNSP } from "@/index";

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

  // Admin UI for Socket.IO
  instrument(io, {
    auth: {
      type: "basic",
      username: "parkjb",
      password: bcrypto.hashSync(process.env.SOCKETIO_PW_HASH_KEY!, 10),
    },
    namespaceName: "/admin",
    mode: "development",
  });
};
