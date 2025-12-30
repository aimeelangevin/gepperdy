import mongoose, { Schema, Model, InferSchemaType } from "mongoose";
import type { WithId } from "@/lib/mongoose-types";

const RoundSchema = new Schema(
  {
    categoryIds: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

type RoundDocument = InferSchemaType<typeof RoundSchema>;
export type Round = WithId<Omit<RoundDocument, "createdAt" | "updatedAt">>;

const RoundModel: Model<RoundDocument> =
  mongoose.models.Round || mongoose.model<RoundDocument>("Round", RoundSchema);

export default RoundModel;

