import mongoose, { Schema, Model, InferSchemaType } from "mongoose";
import type { WithId } from "@/lib/mongoose-types";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    questionIds: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

type CategoryDocument = InferSchemaType<typeof CategorySchema>;
export type Category = WithId<
  Omit<CategoryDocument, "createdAt" | "updatedAt">
>;

const CategoryModel: Model<CategoryDocument> =
  mongoose.models.Category ||
  mongoose.model<CategoryDocument>("Category", CategorySchema);

export default CategoryModel;

