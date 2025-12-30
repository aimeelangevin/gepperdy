import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import QuestionModel from "@/models/Question";

// GET single question by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const question = await QuestionModel.findById(id);

    if (!question) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: question._id.toString(),
        text: question.text,
        imageUrl: question.imageUrl,
        audioUrl: question.audioUrl,
        answer: question.answer,
        isDailyDouble: question.isDailyDouble,
        points: question.points,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch question",
      },
      { status: 500 }
    );
  }
}

// PUT - Update question by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { text, imageUrl, audioUrl, answer, isDailyDouble, points } = body;

    const question = await QuestionModel.findByIdAndUpdate(
      id,
      {
        ...(text !== undefined && { text }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(audioUrl !== undefined && { audioUrl }),
        ...(answer !== undefined && { answer }),
        ...(isDailyDouble !== undefined && { isDailyDouble }),
        ...(points !== undefined && { points }),
      },
      { new: true, runValidators: true }
    );

    if (!question) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: question._id.toString(),
        text: question.text,
        imageUrl: question.imageUrl,
        audioUrl: question.audioUrl,
        answer: question.answer,
        isDailyDouble: question.isDailyDouble,
        points: question.points,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update question",
      },
      { status: 400 }
    );
  }
}

// DELETE question by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const deletedQuestion = await QuestionModel.findByIdAndDelete(id);

    if (!deletedQuestion) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: deletedQuestion._id.toString(),
        text: deletedQuestion.text,
        imageUrl: deletedQuestion.imageUrl,
        audioUrl: deletedQuestion.audioUrl,
        answer: deletedQuestion.answer,
        isDailyDouble: deletedQuestion.isDailyDouble,
        points: deletedQuestion.points,
      },
      message: "Question deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete question",
      },
      { status: 500 }
    );
  }
}
