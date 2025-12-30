import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import RoundModel from "@/models/Round";

// GET all rounds
export async function GET() {
  try {
    await connectDB();
    const rounds = await RoundModel.find({}).lean();

    return NextResponse.json({
      success: true,
      data: rounds,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch rounds",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new round
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { categoryIds } = body;

    const newRound = await RoundModel.create({
      categoryIds: categoryIds || [],
    });

    return NextResponse.json(
      {
        success: true,
        data: newRound.toObject(),
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create round",
      },
      { status: 400 }
    );
  }
}
