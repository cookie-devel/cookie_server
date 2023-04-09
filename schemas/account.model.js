import mongoose from "mongoose";
import crypto from "crypto";
import Joi from "joi";

function hash(password) {
  return crypto
    .createHmac("sha256", process.env.PASSWORD_HASH_KEY)
    .update(password)
    .digest("hex");
}

const { Schema } = mongoose;

const accountSchema = new Schema(
  {
    userid: {
      type: String,
      required: true,
      unique: true,
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
    friendList: {
      type: Array,
      required: false,
    },
    chatList: {
      type: Array,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);



accountSchema.statics.createAccount = async function ({
  userid,
  password,
  username,
  birthday,
  phone,
  profile,
}) {
  const account = new this({
    userid,
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
  const obj = { userid, phone };

  Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key]);

  return this.findOne(obj);
};

accountSchema.methods.verifyPassword = function (password) {
  const hashed = hash(password);
  return this.password === hashed;
};

accountSchema.methods.getProfile = function () {
  return this.profile;
};

const Account = mongoose.model("Account", accountSchema);

export default Account;
