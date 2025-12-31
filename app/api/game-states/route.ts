import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import GameStateModel from "@/models/GameState";
import type { CreateGameStateRequest } from "@/types/api";

// Generate a random 5-character alphanumeric code
function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET all game states
export async function GET() {
  try {
    await connectDB();
    const gameStates = await GameStateModel.find({}).lean();

    return NextResponse.json({
      success: true,
      data: gameStates,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch game states",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new game state
export async function POST(request: Request) {
  try {
    await connectDB();
    const body: CreateGameStateRequest = await request.json();
    const {
      gameId,
      teams,
      currentTeamIndex,
      currentRoundIndex,
      completedQuestionIds,
    } = body;

    if (!gameId) {
      return NextResponse.json(
        { success: false, error: "Game ID is required" },
        { status: 400 }
      );
    }

    // Validate that all teams have IDs
    if (teams && teams.length > 0) {
      const teamsWithoutIds = teams.filter(
        (team) => !team.id || team.id.trim() === ""
      );
      if (teamsWithoutIds.length > 0) {
        return NextResponse.json(
          { success: false, error: "All teams must have an id field" },
          { status: 400 }
        );
      }
    }

    // Use findOneAndUpdate with upsert to atomically create or return existing game state
    // This prevents race conditions where multiple requests try to create at the same time
    let joinCode: string | undefined = undefined;
    let codeUnique = false;
    let attempts = 0;

    // First, try to find existing game state
    const existingGameState = await GameStateModel.findOne({ gameId }).lean();
    if (existingGameState) {
      // Return the existing game state instead of creating a duplicate
      return NextResponse.json(
        {
          success: true,
          data: existingGameState,
        },
        { status: 200 }
      );
    }

    // Generate a unique join code (only if we need to create a new one)
    while (!codeUnique && attempts < 10) {
      joinCode = generateJoinCode();
      const existing = await GameStateModel.findOne({ joinCode });
      if (!existing) {
        codeUnique = true;
      }
      attempts++;
    }

    if (!codeUnique || !joinCode) {
      return NextResponse.json(
        { success: false, error: "Failed to generate unique join code" },
        { status: 500 }
      );
    }

    // Use findOneAndUpdate with upsert to atomically create or get existing
    // The $setOnInsert ensures these fields are only set when creating (not updating)
    const gameState = await GameStateModel.findOneAndUpdate(
      { gameId },
      {
        $setOnInsert: {
          gameId,
          joinCode,
          state: "setup",
          teams: teams || [],
          currentTeamIndex: currentTeamIndex ?? 0,
          questionPickerTeamIndex: 0, // Will be set when game starts
          currentRoundIndex: currentRoundIndex ?? 0,
          completedQuestionIds: completedQuestionIds || [],
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    if (!gameState) {
      return NextResponse.json(
        { success: false, error: "Failed to create or retrieve game state" },
        { status: 500 }
      );
    }

    const gameStateData = gameState;

    return NextResponse.json(
      {
        success: true,
        data: gameStateData,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create game state",
      },
      { status: 400 }
    );
  }
}
