import mongoose, { Schema, Model, InferSchemaType } from "mongoose";
import type { WithId } from "@/lib/mongoose-types";

const TeamSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    score: { type: Number, default: 0 },
  },
  { _id: false }
);

export type Team = InferSchemaType<typeof TeamSchema>;

const GameStateSchema = new Schema(
  {
    gameId: { type: String, required: true },
    teams: { type: [TeamSchema], default: [] },
    currentTeamIndex: { type: Number, default: 0 },
    currentRoundIndex: { type: Number, default: 0 },
    completedQuestionIds: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

type GameStateDocument = InferSchemaType<typeof GameStateSchema>;
export type GameState = WithId<Omit<GameStateDocument, "createdAt" | "updatedAt">>;

const GameStateModel: Model<GameStateDocument> =
  mongoose.models.GameState ||
  mongoose.model<GameStateDocument>("GameState", GameStateSchema);

export default GameStateModel;

