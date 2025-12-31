import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import GameStateModel from "@/models/GameState";
import type { Team } from "@/models/GameState";

interface JoinGameRequest {
  joinCode: string;
  teamName: string;
}

// POST - Join a game by join code
export async function POST(request: Request) {
  try {
    await connectDB();
    const body: JoinGameRequest = await request.json();
    const { joinCode, teamName } = body;

    if (!joinCode || !teamName) {
      return NextResponse.json(
        { success: false, error: "Join code and team name are required" },
        { status: 400 }
      );
    }

    // Find game state by join code
    const gameState = await GameStateModel.findOne({ joinCode: joinCode.toUpperCase() });
    
    if (!gameState) {
      return NextResponse.json(
        { success: false, error: "Invalid join code" },
        { status: 404 }
      );
    }

    // Generate a unique team ID
    const teamId = crypto.randomUUID();

    // Create new team
    const newTeam: Team = {
      id: teamId,
      name: teamName.trim() || `Team ${gameState.teams.length + 1}`,
      score: 0,
    };

    // Add team to game state
    gameState.teams.push(newTeam);
    await gameState.save();

    const gameStateObj = gameState.toObject();

    return NextResponse.json({
      success: true,
      data: {
        ...gameStateObj,
        teamId, // Include the new team's ID in the response for easy access
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to join game",
      },
      { status: 400 }
    );
  }
}

