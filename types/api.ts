/**
 * Shared API request and response types
 * These types are used by both API routes and the API client
 */

import type { User } from "@/models/User";
import type { Category } from "@/models/Category";
import type { Game } from "@/models/Game";
import type { GameState, Team } from "@/models/GameState";
import type { Question } from "@/models/Question";
import type { Round } from "@/models/Round";
import type { Theme } from "@/types/theme";

// Upload URL types
export interface GetUploadUrlRequest {
  fileName: string;
  fileType: string;
}

export interface GetUploadUrlResponse {
  presignedUrl: string;
  objectUrl: string;
  key: string;
}

// User API types
export interface CreateUserRequest {
  name: string;
  email: string;
  passwordHash: string;
}

export type UpdateUserRequest = Partial<Omit<User, "_id">>;

// Category API types
export interface CreateCategoryRequest {
  name: string;
  questionIds?: string[];
}

export type UpdateCategoryRequest = Partial<Omit<Category, "_id">>;

// Question API types
export interface CreateQuestionRequest {
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  answer: string;
  isDailyDouble?: boolean;
  points: number;
}

export type UpdateQuestionRequest = Partial<Omit<Question, "_id">>;

// Round API types
export interface CreateRoundRequest {
  categoryIds?: string[];
}

export type UpdateRoundRequest = Partial<Omit<Round, "_id">>;

// Game API types
export interface CreateGameRequest {
  userId: string;
  name: string;
  theme: Theme;
  type?: "single" | "double";
}

export type UpdateGameRequest = Partial<Omit<Game, "_id">>;

// GameState API types
export interface CreateGameStateRequest {
  gameId: string;
  teams?: Team[];
  currentTeamIndex?: number;
  currentRoundIndex?: number;
  completedQuestionIds?: string[];
}

export type UpdateGameStateRequest = Partial<Omit<GameState, "_id">>;
