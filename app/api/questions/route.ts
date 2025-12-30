import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import QuestionModel from "@/models/Question";
import type { CreateQuestionRequest } from "@/types/api";

// GET all questions
export async function GET() {
  try {
    await connectDB();
    const questions = await QuestionModel.find({}).lean();

    return NextResponse.json({
      success: true,
      data: questions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch questions",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new question
export async function POST(request: Request) {
  try {
    await connectDB();
    const body: CreateQuestionRequest = await request.json();
    const { text, imageUrl, audioUrl, answer, isDailyDouble, points } = body;

    if (!answer || points === undefined) {
      return NextResponse.json(
        { success: false, error: "Answer and points are required" },
        { status: 400 }
      );
    }

    const newQuestion = await QuestionModel.create({
      text,
      imageUrl,
      audioUrl,
      answer,
      isDailyDouble: isDailyDouble || false,
      points,
    });

    return NextResponse.json(
      {
        success: true,
        data: newQuestion.toObject(),
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create question",
      },
      { status: 400 }
    );
  }
}
