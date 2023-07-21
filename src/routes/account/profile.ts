import multer from "multer";
import express from "express";
import path from "path";
import { verifyToken } from "../../middlewares/jwt/verifyToken";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userid = req.decoded["userid"];
    const path = `/uploads/${userid}/`;
    fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: function (req, file, cb) {
    const userid = req.decoded["userid"];
    const ext = path.extname(file.originalname);

    cb(null, `${userid}.${new Date().valueOf()}${ext}`);
  },
});

const upload = multer({ storage });
const router = express.Router();

router.get("/", (req, res) => {});

router.post("/", verifyToken, upload.single("image"), (req, res) => {
  console.log(req.file);

  res.json({ ok: true, data: "Single Upload Ok" });
});

export default router;
