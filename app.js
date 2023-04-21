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
import socketioHandler from "./modules/socket.io/handler.js";
import {
  existsRouter,
  signinRouter,
  signupRouter,
} from "./routes/account/index.js";

dotenv.config();

const __dirname = path.resolve();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  }
});
socketioHandler(io);

instrument(io, {
  auth: {
    type: "basic",
    username: "parkjb",
    password: bcrypto.hashSync(process.env.SOCKETIO_PW_HASH_KEY, 10),
  },
  namespaceName: "/admin",
  mode: "development",
})

app.use(express.static(path.join(__dirname, "public")));
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// MongoDB
mongoose.Promise = global.Promise;
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("Could not connect to MongoDB", err));

app.use("/account/exists", existsRouter);
app.use("/account/signup", signupRouter);
app.use("/account/signin", signinRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
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
