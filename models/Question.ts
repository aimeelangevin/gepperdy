import mongoose, { Schema, Model, InferSchemaType } from "mongoose";
import type { WithId } from "@/lib/mongoose-types";

const QuestionSchema = new Schema(
  {
    text: { type: String },
    imageUrl: { type: String },
    audioUrl: { type: String },
    answer: { type: String, required: true },
    isDailyDouble: { type: Boolean, default: false },
    points: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

type QuestionDocument = InferSchemaType<typeof QuestionSchema>;
export type Question = WithId<
  Omit<QuestionDocument, "createdAt" | "updatedAt">
>;

const QuestionModel: Model<QuestionDocument> =
  mongoose.models.Question ||
  mongoose.model<QuestionDocument>("Question", QuestionSchema);

export default QuestionModel;

