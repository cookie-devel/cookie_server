import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";

import type { Socket } from "socket.io";
import type { DefaultEventsMap } from "socket.io/dist/typed-events";
import type { ExtendedError } from "socket.io/dist/namespace";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      decoded?: any;
    }
  }
}

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const token: string | undefined =
    <string | undefined>req.headers["authorization"] ||
    <string | undefined>req.headers["Authorization"];

  try {
    if (!token) throw new TokenNotProvidedError();

    req.decoded = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET_KEY!
    );
    return next();
  } catch (e: any) {
    return Object.prototype.hasOwnProperty.call(errorHandlers, e.name)
      ? errorHandlers[e.name](res, e)
      : res.status(500).json({ name: e.name, message: e.message });
  }
};

const verifySocketToken = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
  next: (err?: ExtendedError | undefined) => void
) => {
  // for postman testing, access_token is used instead of auth.token
  const token =
    socket.handshake.auth.token || socket.handshake.headers.access_token;

  try {
    if (!token) throw new TokenNotProvidedError();
    socket.data.decoded = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET_KEY!
    );
    socket.data.userID = socket.data.decoded["userid"];
    socket.data.userName = socket.data.decoded["username"];
    console.log(
      `User ${socket.data.userID}(${socket.data.userName}) connected (socketid: ${socket.id})`
    );
    return next();
  } catch (e: any) {
    if (e.name === "TokenExpireError") {
      return next(new Error("토큰이 만료되었습니다."));
    }
    // 토큰의 비밀키가 일치하지 않는 경우
    if (e.name === "JsonWebTokenError") {
      return next(new Error("유효하지 않은 토큰입니다."));
    }
    return next(e);
  }
};

class TokenNotProvidedError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "TokenNotProvidedError";
  }
}

const errorHandlers = {
  TokenNotProvidedError: (res: Response, error: Error) =>
    res.status(403).json({
      name: error.name,
      message: "토큰이 제공되지 않았습니다.",
    }),
  TokenExpireError: (res: Response, error: Error) =>
    res.status(419).json({
      name: error.name,
      message: "토큰이 만료되었습니다.",
    }),
  JsonWebTokenError: (res: Response, error: Error) =>
    res.status(401).json({
      name: error.name,
      message: "유효하지 않은 토큰입니다.",
    }),
};

export { verifySocketToken, verifyToken };
