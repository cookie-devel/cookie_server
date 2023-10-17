import mongoose, { InferSchemaType, Schema } from "mongoose";

const LocationSchema = new Schema({
  latitude: { type: Number, require: true },
  longitude: { type: Number, require: true },
});

export { LocationSchema };
export type ILocation = InferSchemaType<typeof LocationSchema>;
export default mongoose.model("Location", LocationSchema);
