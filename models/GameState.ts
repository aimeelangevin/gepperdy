import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

const TeamSchema = new Schema(
  {
    name: { type: String, required: true },
    score: { type: Number, default: 0 },
  },
  { _id: true }
);

type TeamDocument = InferSchemaType<typeof TeamSchema>;
export type Team = Omit<TeamDocument, "_id"> & { _id: string };

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
export type GameState = Omit<
  GameStateDocument,
  "_id" | "createdAt" | "updatedAt"
> & {
  _id: string;
  teams: Team[];
};

const GameStateModel: Model<GameStateDocument> =
  mongoose.models.GameState ||
  mongoose.model<GameStateDocument>("GameState", GameStateSchema);

export default GameStateModel;

