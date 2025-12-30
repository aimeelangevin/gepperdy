import mongoose, { Schema, Model, InferSchemaType } from "mongoose";
import { Theme } from "@/types/theme";
import type { WithId } from "@/lib/mongoose-types";

const GameSchema = new Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    theme: {
      type: String,
      required: true,
      enum: Object.values(Theme),
    },
    roundIds: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

type GameDocument = InferSchemaType<typeof GameSchema>;
// WithId utility ensures _id is always included (Mongoose adds it automatically to all documents)
// This is cleaner than manually adding { _id: Types.ObjectId } each time
export type Game = WithId<Omit<GameDocument, "createdAt" | "updatedAt">> & {
  theme: Theme;
};

const GameModel: Model<GameDocument> =
  mongoose.models.Game || mongoose.model<GameDocument>("Game", GameSchema);

export default GameModel;

