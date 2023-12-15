import http from "http";
import dotenv from "dotenv";
import path from "path";
import express from "express";
import type { NextFunction, Request, Response } from "express";

dotenv.config();

const app = express();
const server = http.createServer(app);

// ****************************************************
// Firebase Admin SDK
// ****************************************************
import admin from "firebase-admin";
import serviceAccount from "../cookie-fire-firebase-adminsdk-4bs90-48c29705f6.json";
import { sendPush, sendTopic } from "./utils/push";

// https://firebase.google.com/docs/cloud-messaging/send-message?authuser=0&hl=ko
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  databaseURL:
    "https://cookie-fire-default-rtdb.asia-southeast1.firebasedatabase.app",
});

sendTopic("cookie-server", {
  title: "Cookie Server",
  subtitle: "Server Message",
  body: "Server Restarted",
  imageUrl:
    "https://file.mk.co.kr/meet/neds/2023/09/image_readtop_2023_711979_16950994225631775.jpg",
});

// ****************************************************
// Socket.IO
// ****************************************************
import { Server as SocketIOServer } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import chatHandler from "@/io/handler.chat";
import locationHandler from "@/io/handler.location";
import { verifySocketToken } from "@/middlewares/verifyToken";
import bcrypt from "bcrypt";

const io = new SocketIOServer(server, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});
// Admin UI for Socket.IO
instrument(io, {
  auth:
    process.env.NODE_ENV === "development"
      ? false
      : {
        type: "basic",
        username: process.env.SOCKETIO_ADMIN_USERNAME!,
        password: bcrypt.hashSync(process.env.SOCKETIO_PW_HASH_KEY!, 10),
      },
  mode: "development",
});

export const chatNSP = io.of("/chat");
export const locationNSP = io.of("/location");
chatNSP.use(verifySocketToken);
locationNSP.use(verifySocketToken);

const handle = (nsp, handler) => handler(nsp);

// namespace handlers
handle(chatNSP, chatHandler);
handle(locationNSP, locationHandler);

console.log("Socket.IO Initialized");

// ****************************************************
// Mongoose
// ****************************************************
import { MongoClient } from "mongodb";
import mongoose from "mongoose";
const mongoClient = new MongoClient(process.env.MONGODB_URI!);
mongoClient
  .connect()
  // .then(() => {
  //   const mongoCollection = mongoClient.db("dev-cookie").collection("sessions");
  //
  //   io.adapter(createAdapter(mongoCollection));
  //   io.listen(3001);
  //
  //   console.log("IO MongoDB connected: 3001");
  // })
  .catch((err) => console.log(err));

mongoose.Promise = global.Promise;
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log(`Connected to MongoDB ${process.env.MONGODB_URI}`))
  .catch((err) => console.log("Could not connect to MongoDB", err));

// ****************************************************
// Express Middlewares
// ****************************************************
import cookieParser from "cookie-parser";
import logger from "morgan";
import createError from "http-errors";
import swaggerFile from "@/swagger/swagger-output.json";
import swaggerUi from "swagger-ui-express";
import routers from "@/routes";
import { createAdapter } from "@socket.io/mongo-adapter";

app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// view engine setup
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Swagger
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerFile, { explorer: true })
);

// Routes
app.use("/", routers);

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
  return res.status(err.status || 500).json(err);
});

server.listen(process.env.PORT, () => {
  console.log(`listening on *:${process.env.PORT}`);
});
