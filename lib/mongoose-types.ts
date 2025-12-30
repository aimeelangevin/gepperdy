import { Types } from "mongoose";

/**
 * Utility type to ensure _id is always included in Mongoose document types
 * Since all Mongoose documents have _id, this ensures it's in the type
 */
export type WithId<T> = T & { _id: Types.ObjectId };

