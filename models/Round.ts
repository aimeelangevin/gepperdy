import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

const RoundSchema = new Schema(
  {
    categoryIds: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

type RoundDocument = InferSchemaType<typeof RoundSchema>;
export type Round = Omit<RoundDocument, "_id" | "createdAt" | "updatedAt"> & {
  _id: string;
};

const RoundModel: Model<RoundDocument> =
  mongoose.models.Round || mongoose.model<RoundDocument>("Round", RoundSchema);

export default RoundModel;

