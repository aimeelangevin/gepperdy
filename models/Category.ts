import mongoose, { Schema, Model, InferSchemaType } from "mongoose";

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
export type Category = Omit<
  CategoryDocument,
  "_id" | "createdAt" | "updatedAt"
> & {
  _id: string;
};

const CategoryModel: Model<CategoryDocument> =
  mongoose.models.Category ||
  mongoose.model<CategoryDocument>("Category", CategorySchema);

export default CategoryModel;

