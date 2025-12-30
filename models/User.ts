import mongoose, { Schema, Model, InferSchemaType } from "mongoose";
import type { WithId } from "@/lib/mongoose-types";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

type UserDocument = InferSchemaType<typeof UserSchema>;
export type User = WithId<Omit<UserDocument, "createdAt" | "updatedAt">>;

const UserModel: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>("User", UserSchema);

export default UserModel;

