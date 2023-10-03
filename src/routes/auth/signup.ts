import express from "express";
import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import multer from "multer";
import fs from "fs";
import path from "path";
import Account from "@/schemas/account.model";

const router = express.Router();

// TODO: https://dev.to/tayfunakgc/middleware-based-joi-validation-in-expressjs-2po5

const schema = Joi.object({
  userid: Joi.string().min(6).max(30).required(),
  password: Joi.string().min(10).max(30).required(),
  username: Joi.string().min(1).max(10).required(),
  birthday: Joi.date().required(),
  phone: Joi.string().min(11).max(11).required(),
  profile_message: Joi.string().optional(),
});

const validate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.validateAsync(req.body);
  } catch (e: any) {
    return res.status(400).json({ message: e.message });
  }
  next();
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userid = req.body.userid;
    const path = `./uploads/${userid}/`;
    fs.mkdir(path, { recursive: true }, (err) => {});
    cb(null, path);
  },
  filename: function (req, file, cb) {
    const userid = req.body.userid;
    const ext = path.extname(file.originalname);

    cb(null, `${userid}.profile.${new Date().valueOf()}${ext}`);
  },
});

const upload = multer({ storage });

router.post(
  "/",
  upload.single("profile_image"),
  validate,
  async (req, res, next) => {
    try {
      const result = await Account.createAccount({
        ...req.body,
        profile: {
          image: req.file ? req.file.path : null,
          message: req.body.profile_message,
        },
      });

      return res.status(201).json({
        message: "Account Created",
        account: {
          id: result._id,
          name: result.name,
          birthday: result.birthday,
          phone: result.phone,
          profile: result.profile,
        },
      });
    } catch (e: any) {
      if (e.name === "MongoServerError") {
        console.log({ name: e.name, message: e.message });
        return res.status(500).json({
          name: e.code,
          message: e.message,
        });
      } else {
        return res.status(500).json({
          name: "Error",
          message: e.message,
        });
      }
    }
  }
);

export default router;
