import { NextResponse } from 'next/server';
import type { GameState } from '@/types/gameState';

// In-memory storage (replace with a real database in production)
let gameStates: GameState[] = [];

// GET all game states
export async function GET() {
  return NextResponse.json({
    success: true,
    data: gameStates,
  });
}

// POST - Create a new game state
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, teams, currentTeamIndex, currentRoundIndex, completedQuestionIds } = body;

    if (!gameId) {
      return NextResponse.json(
        { success: false, error: 'Game ID is required' },
        { status: 400 }
      );
    }

    const newGameState: GameState = {
      _id: crypto.randomUUID(),
      gameId,
      teams: teams || [],
      currentTeamIndex: currentTeamIndex ?? 0,
      currentRoundIndex: currentRoundIndex ?? 0,
      completedQuestionIds: completedQuestionIds || [],
    };

    gameStates.push(newGameState);

    return NextResponse.json(
      { success: true, data: newGameState },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

