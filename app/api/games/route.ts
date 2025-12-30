import { NextResponse } from 'next/server';
import type { Game } from '@/types/game';

// In-memory storage (replace with a real database in production)
let games: Game[] = [];

// GET all games
export async function GET() {
  return NextResponse.json({
    success: true,
    data: games,
  });
}

// POST - Create a new game
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, theme, roundIds } = body;

    if (!name || !theme) {
      return NextResponse.json(
        { success: false, error: 'Name and theme are required' },
        { status: 400 }
      );
    }

    const newGame: Game = {
      _id: crypto.randomUUID(),
      name,
      theme,
      roundIds: roundIds || [],
    };

    games.push(newGame);

    return NextResponse.json(
      { success: true, data: newGame },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

