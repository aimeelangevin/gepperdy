import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import GameModel from "@/models/Game";
import RoundModel from "@/models/Round";
import CategoryModel from "@/models/Category";
import QuestionModel from "@/models/Question";

// GET all games
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId query parameter is required" },
        { status: 400 }
      );
    }
    const games = await GameModel.find({ userId }).lean();

    return NextResponse.json({
      success: true,
      data: games,
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

// POST - Create a new game with placeholder rounds, categories, and questions
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, theme, type } = body;

    if (!name || !theme) {
      return NextResponse.json(
        { success: false, error: "Name and theme are required" },
        { status: 400 }
      );
    }

    const numRounds = type === "double" ? 2 : 1;
    const roundIds: string[] = [];

    // Create rounds with placeholder categories and questions
    for (let roundIndex = 0; roundIndex < numRounds; roundIndex++) {
      const isDoubleJeopardy = roundIndex === 1; // Second round is double jeopardy
      const pointMultiplier = isDoubleJeopardy ? 2 : 1;
      const categoryIds: string[] = [];

      // Create 5 categories per round
      for (let catIndex = 0; catIndex < 5; catIndex++) {
        const questionIds: string[] = [];

        // Create 5 questions per category
        for (let qIndex = 0; qIndex < 5; qIndex++) {
          const question = await QuestionModel.create({
            text: "",
            answer: "",
            isDailyDouble: false,
            points: (qIndex + 1) * 100 * pointMultiplier,
          });
          questionIds.push(question._id.toString());
        }

        // Create category
        const category = await CategoryModel.create({
          name: `Category ${catIndex + 1}`,
          questionIds,
        });
        categoryIds.push(category._id.toString());
      }

      // Create round
      const round = await RoundModel.create({
        categoryIds,
      });
      roundIds.push(round._id.toString());
    }

    // Create the game
    const newGame = await GameModel.create({
      name,
      theme,
      roundIds,
    });

    return NextResponse.json(
      {
        success: true,
        data: newGame.toObject(),
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
