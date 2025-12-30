import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import GameModel from "@/models/Game";

// GET all games
export async function GET() {
  try {
    await connectDB();
    const games = await GameModel.find({});
    const gamesData = games.map((game) => ({
      _id: game._id.toString(),
      name: game.name,
      theme: game.theme,
      roundIds: game.roundIds,
    }));

    return NextResponse.json({
      success: true,
      data: gamesData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch games",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new game
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, theme, roundIds } = body;

    if (!name || !theme) {
      return NextResponse.json(
        { success: false, error: "Name and theme are required" },
        { status: 400 }
      );
    }

    const newGame = await GameModel.create({
      name,
      theme,
      roundIds: roundIds || [],
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: newGame._id.toString(),
          name: newGame.name,
          theme: newGame.theme,
          roundIds: newGame.roundIds,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create game",
      },
      { status: 400 }
    );
  }
}
