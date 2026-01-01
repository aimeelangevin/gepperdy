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
    joinCode: { type: String, required: true, unique: true, index: true },
    state: {
      type: String,
      required: true,
      enum: [
        "setup",
        "active",
        "question_active",
        "answering",
        "showing_answer",
        "final_jeopardy",
        "finished",
      ],
      default: "setup",
    },
    teams: { type: [TeamSchema], default: [] },
    currentTeamIndex: { type: Number, default: 0 }, // Keep for backwards compatibility, but use questionPickerTeamIndex instead
    questionPickerTeamIndex: { type: Number, default: 0 }, // Team that picked the current question (controls the board)
    currentRoundIndex: { type: Number, default: 0 },
    completedQuestionIds: { type: [String], default: [] },
    buzzedTeamId: { type: String, default: null }, // Track which team buzzed in
    finalJeopardyAnswers: {
      type: Map,
      of: String, // Maps teamId -> imageUrl
      default: {},
    },
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

