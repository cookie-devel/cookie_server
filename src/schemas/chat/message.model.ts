import { ObjectId } from "mongodb";
import mongoose, { InferSchemaType, Schema } from "mongoose";

const MessageSchema = new Schema(
  {
    _id: { type: ObjectId, required: true, auto: true },
    sender: { type: String, required: true, ref: "Account" },
    time: { type: Date, required: true },
    content: { type: Object, required: true },
  },
  {
    collection: "messages",
    timestamps: true,
    query: {
      getPopulatedById(_id) {
        return this.findById(_id).populate("sender").exec();
      },
    },
  }
);

export { MessageSchema };
export type IMessage = InferSchemaType<typeof MessageSchema>;
export default mongoose.model("Message", MessageSchema);
