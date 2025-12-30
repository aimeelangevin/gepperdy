import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import CategoryModel from "@/models/Category";

// GET all categories
export async function GET() {
  try {
    await connectDB();
    const categories = await CategoryModel.find({});
    const categoriesData = categories.map((category) => ({
      _id: category._id.toString(),
      name: category.name,
      questionIds: category.questionIds,
    }));

    return NextResponse.json({
      success: true,
      data: categoriesData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch categories",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new category
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, questionIds } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    const newCategory = await CategoryModel.create({
      name,
      questionIds: questionIds || [],
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: newCategory._id.toString(),
          name: newCategory.name,
          questionIds: newCategory.questionIds,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create category",
      },
      { status: 400 }
    );
  }
}
