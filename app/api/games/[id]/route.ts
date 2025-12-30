import { NextResponse } from 'next/server';
import type { Game } from '@/types/game';

// In-memory storage (should match the one in ../route.ts in production)
let games: Game[] = [];

// GET single game by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const game = games.find((g) => g._id === id);

  if (!game) {
    return NextResponse.json(
      { success: false, error: 'Game not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: game,
  });
}

// PUT - Update game by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, theme, roundIds } = body;

    const gameIndex = games.findIndex((g) => g._id === id);

    if (gameIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    if (name !== undefined) games[gameIndex].name = name;
    if (theme !== undefined) games[gameIndex].theme = theme;
    if (roundIds !== undefined) games[gameIndex].roundIds = roundIds;

    return NextResponse.json({
      success: true,
      data: games[gameIndex],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// DELETE game by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gameIndex = games.findIndex((g) => g._id === id);

  if (gameIndex === -1) {
    return NextResponse.json(
      { success: false, error: 'Game not found' },
      { status: 404 }
    );
  }

  const deletedGame = games.splice(gameIndex, 1)[0];

  return NextResponse.json({
    success: true,
    data: deletedGame,
    message: 'Game deleted successfully',
  });
}

