import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import GameStateModel from "@/models/GameState";
import type { UpdateGameStateRequest } from "@/types/api";

// GET single game state by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const gameState = await GameStateModel.findById(id).lean();

    if (!gameState) {
      return NextResponse.json(
        { success: false, error: "Game state not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: gameState,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch game state",
      },
      { status: 500 }
    );
  }
}

// PUT - Update game state by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body: UpdateGameStateRequest = await request.json();
           const {
             gameId,
             state,
             teams,
             currentTeamIndex,
             questionPickerTeamIndex,
             currentRoundIndex,
             completedQuestionIds,
             buzzedTeamId,
             failedTeamIds,
             finalJeopardyAnswers,
           } = body;

    // Validate that all teams have IDs if teams are being updated
    if (teams !== undefined && teams.length > 0) {
      const teamsWithoutIds = teams.filter((team) => !team.id || team.id.trim() === '');
      if (teamsWithoutIds.length > 0) {
        return NextResponse.json(
          { success: false, error: "All teams must have an id field" },
          { status: 400 }
        );
      }
    }

    // Log failedTeamIds update
    if (failedTeamIds !== undefined) {
      console.log('[UPDATE] Updating failedTeamIds:', {
        gameStateId: id,
        failedTeamIds,
        failedCount: failedTeamIds.length,
        isArray: Array.isArray(failedTeamIds),
        totalTeams: teams?.length || 'not provided'
      });
    }

    // Build update object - explicitly handle failedTeamIds to ensure empty arrays are set
    const updateData: any = {};
    if (gameId !== undefined) updateData.gameId = gameId;
    if (state !== undefined) updateData.state = state;
    if (teams !== undefined) updateData.teams = teams;
    if (currentTeamIndex !== undefined) updateData.currentTeamIndex = currentTeamIndex;
    if (questionPickerTeamIndex !== undefined) updateData.questionPickerTeamIndex = questionPickerTeamIndex;
    if (currentRoundIndex !== undefined) updateData.currentRoundIndex = currentRoundIndex;
    if (completedQuestionIds !== undefined) updateData.completedQuestionIds = completedQuestionIds;
    if (buzzedTeamId !== undefined) updateData.buzzedTeamId = buzzedTeamId;
    // Explicitly set failedTeamIds - even if empty array, we want to clear it
    if (failedTeamIds !== undefined) {
      updateData.failedTeamIds = Array.isArray(failedTeamIds) ? failedTeamIds : [];
    }
    if (finalJeopardyAnswers !== undefined) updateData.finalJeopardyAnswers = finalJeopardyAnswers;

           const gameState = await GameStateModel.findByIdAndUpdate(
             id,
             updateData,
             { new: true, runValidators: true }
           ).lean();

    if (!gameState) {
      return NextResponse.json(
        { success: false, error: "Game state not found" },
        { status: 404 }
      );
    }

    // Log what was actually saved (always log failedTeamIds, even if empty)
    if (updateData.failedTeamIds !== undefined || gameState.failedTeamIds !== undefined) {
      console.log('[UPDATE] Saved gameState with failedTeamIds:', {
        gameStateId: id,
        failedTeamIds: gameState.failedTeamIds || [],
        failedCount: (gameState.failedTeamIds || []).length,
        totalTeams: gameState.teams.length,
        wasCleared: updateData.failedTeamIds !== undefined && Array.isArray(updateData.failedTeamIds) && updateData.failedTeamIds.length === 0
      });
    }

    return NextResponse.json({
      success: true,
      data: gameState,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update game state",
      },
      { status: 400 }
    );
  }
}

// DELETE game state by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const deletedGameState = await GameStateModel.findByIdAndDelete(id).lean();

    if (!deletedGameState) {
      return NextResponse.json(
        { success: false, error: "Game state not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deletedGameState,
      message: "Game state deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete game state",
      },
      { status: 500 }
    );
  }
}
