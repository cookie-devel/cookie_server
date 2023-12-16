import mongoose, { InferSchemaType, Schema } from "mongoose";

export const DeviceSchema = new Schema(
  {
    udid: {
      type: String,
      required: true,
      unique: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    collection: "devices",
    timestamps: true,
  }
);

export type IDevice = InferSchemaType<typeof DeviceSchema>;
export default mongoose.model("Device", DeviceSchema);
