// Reference
// https://mongoosejs.com/docs/typescript/statics.html
// https://mongoosejs.com/docs/typescript/statics-and-methods.html
// There are some bugs (methods won't work) when mongoose infers type when you make static query
// You should use query field instead of making static method query

import mongoose, { InferSchemaType, Schema, Types } from "mongoose";
import crypto from "crypto";
import jwt from "jsonwebtoken";

function hash(password: string) {
  return crypto
    .createHmac("sha256", process.env.PASSWORD_HASH_KEY!)
    .update(password)
    .digest("hex");
}

export const ProfileSchema = new Schema({
  image: {
    type: String,
  },
  message: {
    type: String,
  },
});

export const AccountSchema = new Schema(
  {
    _id: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
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
      type: ProfileSchema,
      required: true,
    },
    friendIDs: [
      {
        type: String,
        ref: "Account",
      },
    ],
    chatRoomIDs: [
      {
        type: Types.ObjectId,
        ref: "ChatRoom",
      },
    ],
    deviceTokens: [
      {
        type: Types.ObjectId,
        required: true,
        ref: "Device",
      },
    ],
  },
  {
    collection: "accounts",
    timestamps: true,
    query: {
      byPhone: function (phone: string) {
        return this.findOne({ phone });
      },
    },
    statics: {
      async createAccount({
        userid: _id,
        password,
        username: name,
        birthday,
        phone,
        profile,
      }) {
        const account = new this({
          _id,
          password: hash(password),
          name,
          birthday,
          phone,
          profile,
        });

        return account.save();
      },
    },
    methods: {
      generateJWT() {
        return (
          "Bearer " +
          jwt.sign(
            {
              userid: this._id,
              username: this.name,
            },
            process.env.JWT_SECRET_KEY!,
            {
              algorithm: "HS256",
              expiresIn: "7d",
              issuer: process.env.BASE_URI,
              subject: "userInfo",
            }
          )
        );
      },
      verifyPassword(password: string) {
        const hashed = hash(password);
        return this.password === hashed;
      },
      async getFriends() {
        return (await this.populate("friendIDs", "_id name profile"))[
          "friendIDs"
        ];
      },
      addChatRoom(roomId) {
        this.chatRoomIDs.push(roomId);
        this.save();
      },
      async getChatRooms() {
        return (
          await this.populate(
            "chatRoomIDs",
            "_id name members messages createdAt"
          )
        )["chatRoomIDs"];
      },
    },
  }
);

// Use transform to rename _id to userid (if needed)
const transform = function (doc, ret, options) {
  // ret.userid = doc._id;
  ret.id = doc._id;
  delete ret._id;
};

AccountSchema.set("toObject", { transform });
AccountSchema.set("toJSON", { transform });

export type IAccount = InferSchemaType<typeof AccountSchema>;
export type IProfile = InferSchemaType<typeof ProfileSchema>;
export default mongoose.model("Account", AccountSchema);
