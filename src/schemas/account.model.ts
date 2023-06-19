import mongoose from "mongoose";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { Model, QueryWithHelpers } from "mongoose";

function hash(password: string) {
  return crypto
    .createHmac("sha256", process.env.PASSWORD_HASH_KEY!)
    .update(password)
    .digest("hex");
}

const { Schema } = mongoose;

const accountSchema = new Schema(
  {
    _id: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: false,
    },
    birthday: {
      type: Date,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    profile: {
      type: Object,
      required: true,
      default: {
        image: "https://i.imgur.com/1Q9ZQ9r.png",
        message: "Hello, I'm new here!",
      },
    },
    friendList: [
      {
        type: String,
        ref: "Account",
      },
    ],
    chatList: {
      type: Array,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const transform = function (doc: any, ret: any, options: any) {
  // rename _id to userid
  ret.userid = doc._id;
  delete ret._id;
};

accountSchema.set("toObject", { transform });
accountSchema.set("toJSON", { transform });

accountSchema.statics.createAccount = async function ({
  userid,
  password,
  username,
  birthday,
  phone,
  profile,
}) {
  const account = new this({
    _id: userid,
    password: hash(password),
    username,
    birthday,
    phone,
    profile,
  });

  try {
    return account.save();
  } catch (e) {
    throw e;
  }
};

accountSchema.statics.findUser = function ({ userid, phone }) {
  const obj = { _id: userid, phone };

  Object.keys(obj).forEach(
    (key) =>
      obj[key as keyof typeof obj] === undefined &&
      delete obj[key as keyof typeof obj]
  );
  // console.log(obj);

  return this.findOne(obj);
};

accountSchema.methods.generateJWT = function () {
  return jwt.sign(
    {
      userid: this._id,
      username: this.username,
    },
    process.env.JWT_SECRET_KEY!,
    {
      algorithm: "HS256",
      expiresIn: "7d",
      issuer: process.env.BASE_URI,
      subject: "userInfo",
    }
  );
};

accountSchema.methods.verifyPassword = function (password: string) {
  const hashed = hash(password);
  return this.password === hashed;
};

accountSchema.methods.getProfile = function () {
  return this.profile;
};

accountSchema.statics.getFriends = async function (userid) {
  const result = await Account.aggregate([
    {
      $match: {
        _id: userid,
      },
    },
    {
      $limit: 1,
    },
    {
      $lookup: {
        from: "accounts",
        localField: "friendList",
        foreignField: "_id",
        as: "friendList",
      },
    },
    {
      $project: {
        _id: 0,
        userid: "$_id",
        friendList: {
          userid: "$_id",
          username: 1,
          profile: 1,
        },
      },
    },
  ]);

  return result[0]["friendList"];
};

accountSchema.methods.getFriends = async function () {
  return (await this.populate("friendList", "_id username profile"))[
    "friendList"
  ];
};

// methods
interface IAccountDocument {
  getFriends: typeof accountSchema.methods.getFriends;
  generateJWT: typeof accountSchema.methods.generateJWT;
  verifyPassword: typeof accountSchema.methods.verifyPassword;
  getProfile: typeof accountSchema.methods.getProfile;
}

// statics
interface IAccountModel extends Model<IAccountDocument> {
  getFriends: typeof accountSchema.statics.getFriends;
  createAccount: typeof accountSchema.statics.createAccount;
  findUser: typeof accountSchema.statics.findUser;
}

const Account: IAccountModel = mongoose.model<IAccountDocument, IAccountModel>(
  "Account",
  accountSchema
);

export default Account;
