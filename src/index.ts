import createError from "http-errors";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import http from "http";
import express from "express";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypto from "bcryptjs";
import socketioHandler from "./modules/socket.io/handler";
import accountRouter from "./routes/account/index";
import authRouter from "./routes/auth/index";
import type { NextFunction, Request, Response } from "express";

import friendsRouter from "./routes/friends/index";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["https://admin.socket.io", "http://localhost:8080"],
    credentials: true,
  },
});
socketioHandler(io);

instrument(io, {
  auth: {
    type: "basic",
    username: "parkjb",
    password: bcrypto.hashSync(process.env.SOCKETIO_PW_HASH_KEY!, 10),
  },
  namespaceName: "/admin",
  mode: "development",
});

app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// view engine setup
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// MongoDB
mongoose.Promise = global.Promise;
mongoose
  .connect(process.env.MONGODB_URI!, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("Could not connect to MongoDB", err));

// Routes
app.use("/account", accountRouter);
app.use("/auth", authRouter);
app.use("/friends", friendsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err: any, req: Request, res: Response, next: NextFunction) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

server.listen(process.env.PORT, () => {
  console.log(`listening on *:${process.env.PORT}`);
});
