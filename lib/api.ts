// API utility functions for client-side requests

import type { User } from "@/types/user";
import type { Category } from "@/types/category";
import type { Game } from "@/types/game";
import type { GameState } from "@/types/gameState";
import type { Question } from "@/types/question";
import type { Round } from "@/types/round";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Generic fetch wrapper with error handling
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || `HTTP error! status: ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "An error occurred",
    };
  }
}

// User API functions
export const userApi = {
  getAll: () => apiFetch<User[]>("/api/users"),

  getById: (id: string) => apiFetch<User>(`/api/users/${id}`),

  create: (user: Omit<User, "_id">) =>
    apiFetch<User>("/api/users", {
      method: "POST",
      body: JSON.stringify(user),
    }),

  update: (id: string, user: Partial<Omit<User, "_id">>) =>
    apiFetch<User>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(user),
    }),

  delete: (id: string) =>
    apiFetch<User>(`/api/users/${id}`, {
      method: "DELETE",
    }),
};

// Category API functions
export const categoryApi = {
  getAll: () => apiFetch<Category[]>("/api/categories"),

  getById: (id: string) => apiFetch<Category>(`/api/categories/${id}`),

  create: (category: Omit<Category, "_id">) =>
    apiFetch<Category>("/api/categories", {
      method: "POST",
      body: JSON.stringify(category),
    }),

  update: (id: string, category: Partial<Omit<Category, "_id">>) =>
    apiFetch<Category>(`/api/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(category),
    }),

  delete: (id: string) =>
    apiFetch<Category>(`/api/categories/${id}`, {
      method: "DELETE",
    }),
};

// Game API functions
export const gameApi = {
  getAll: () => apiFetch<Game[]>("/api/games"),

  getById: (id: string) => apiFetch<Game>(`/api/games/${id}`),

  create: (game: Omit<Game, "_id">) =>
    apiFetch<Game>("/api/games", {
      method: "POST",
      body: JSON.stringify(game),
    }),

  update: (id: string, game: Partial<Omit<Game, "_id">>) =>
    apiFetch<Game>(`/api/games/${id}`, {
      method: "PUT",
      body: JSON.stringify(game),
    }),

  delete: (id: string) =>
    apiFetch<Game>(`/api/games/${id}`, {
      method: "DELETE",
    }),
};

// GameState API functions
export const gameStateApi = {
  getAll: () => apiFetch<GameState[]>("/api/game-states"),

  getById: (id: string) => apiFetch<GameState>(`/api/game-states/${id}`),

  getByGameId: (gameId: string) =>
    apiFetch<GameState>(`/api/game-states/game/${gameId}`),

  create: (gameState: Omit<GameState, "_id">) =>
    apiFetch<GameState>("/api/game-states", {
      method: "POST",
      body: JSON.stringify(gameState),
    }),

  update: (id: string, gameState: Partial<Omit<GameState, "_id">>) =>
    apiFetch<GameState>(`/api/game-states/${id}`, {
      method: "PUT",
      body: JSON.stringify(gameState),
    }),

  delete: (id: string) =>
    apiFetch<GameState>(`/api/game-states/${id}`, {
      method: "DELETE",
    }),
};

// Question API functions
export const questionApi = {
  getAll: () => apiFetch<Question[]>("/api/questions"),

  getById: (id: string) => apiFetch<Question>(`/api/questions/${id}`),

  create: (question: Omit<Question, "_id">) =>
    apiFetch<Question>("/api/questions", {
      method: "POST",
      body: JSON.stringify(question),
    }),

  update: (id: string, question: Partial<Omit<Question, "_id">>) =>
    apiFetch<Question>(`/api/questions/${id}`, {
      method: "PUT",
      body: JSON.stringify(question),
    }),

  delete: (id: string) =>
    apiFetch<Question>(`/api/questions/${id}`, {
      method: "DELETE",
    }),
};

// Round API functions
export const roundApi = {
  getAll: () => apiFetch<Round[]>("/api/rounds"),

  getById: (id: string) => apiFetch<Round>(`/api/rounds/${id}`),

  create: (round: Omit<Round, "_id">) =>
    apiFetch<Round>("/api/rounds", {
      method: "POST",
      body: JSON.stringify(round),
    }),

  update: (id: string, round: Partial<Omit<Round, "_id">>) =>
    apiFetch<Round>(`/api/rounds/${id}`, {
      method: "PUT",
      body: JSON.stringify(round),
    }),

  delete: (id: string) =>
    apiFetch<Round>(`/api/rounds/${id}`, {
      method: "DELETE",
    }),
};

// Hello API example
export const helloApi = {
  get: () => apiFetch<{ message: string; timestamp: string }>('/api/hello'),
  
  post: (data: any) =>
    apiFetch<{ message: string; receivedData: any; timestamp: string }>(
      '/api/hello',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
};

