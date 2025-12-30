import mongoose, { Schema, Model, InferSchemaType } from "mongoose";
import { Theme } from "@/types/theme";

const GameSchema = new Schema(
  {
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
export type Game = Omit<
  GameDocument,
  "_id" | "createdAt" | "updatedAt"
> & {
  _id: string;
  theme: Theme;
};

const GameModel: Model<GameDocument> =
  mongoose.models.Game || mongoose.model<GameDocument>("Game", GameSchema);

export default GameModel;

