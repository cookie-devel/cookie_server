import createError from "http-errors";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import swaggerFile from "@/swagger/swagger-output.json";
import swaggerUi from "swagger-ui-express";

// Routers
import routers from "@/routes";
import { init as ioinit } from "@/io/init";

dotenv.config();

const app = express();
export const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: ["https://admin.socket.io", "http://localhost:8080"],
    credentials: true,
  },
});

export const chatNSP = io.of("/chat");
export const locationNSP = io.of("/location");

ioinit(io);

app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// view engine setup
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// MongoDB
const mongoClient = new MongoClient(process.env.MONGODB_URI!);
mongoClient
  .connect()
  // .then(() => {
  //   const mongoCollection = mongoClient.db("dev-cookie").collection("sessions");

//   io.adapter(createAdapter(mongoCollection));
//   io.listen(3001);

  //   console.log("IO MongoDB connected: 3001");
  // })
  .catch((err) => console.log(err));

mongoose.Promise = global.Promise;
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log(`Connected to MongoDB ${process.env.MONGODB_URI}`))
  .catch((err) => console.log("Could not connect to MongoDB", err));

// Swagger
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerFile, { explorer: true })
);

// Routes
app.use("/", routers);
// app.use("/account", accountRouter);
// app.use("/auth", authRouter);
// app.use("/chat", chatRouter);

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
