import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";

import type { Socket } from "socket.io";
import type { DefaultEventsMap } from "socket.io/dist/typed-events";
import type { ExtendedError } from "socket.io/dist/namespace";

declare global {
  namespace Express {
    interface Request {
      decoded?: any;
    }
  }
}

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined =
    <string | undefined>req.headers["authorization"] ||
    <string | undefined>req.headers["Authorization"];

  if (!token) {
    return res.status(403).json({
      code: 403,
      message: "토큰이 제공되지 않았습니다.",
    });
  }

  try {
    req.decoded = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET_KEY!
    );
    return next();
  } catch (e: any) {
    if (e.name === "TokenExpireError") {
      return res.status(419).json({
        code: 419,
        message: "토큰이 만료되었습니다.",
      });
    }
    // 토큰의 비밀키가 일치하지 않는 경우
    if (e.name === "JsonWebTokenError") {
      return res.status(401).json({
        code: 401,
        message: "유효하지 않은 토큰입니다.",
      });
    }
    return res.status(500).json(e);
  }
};

const verifySocketToken = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
  next: (err?: ExtendedError | undefined) => void
) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("토큰이 제공되지 않았습니다."));
  }

  try {
    socket.data.decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!);
    // socket.query.user = jwt.verify(token, process.env.JWT_SECRET_KEY!);
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

export { verifySocketToken, verifyToken };
