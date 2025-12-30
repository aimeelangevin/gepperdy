import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import CategoryModel from "@/models/Category";

// GET single category by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const category = await CategoryModel.findById(id);

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: category._id.toString(),
        name: category.name,
        questionIds: category.questionIds,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch category",
      },
      { status: 500 }
    );
  }
}

// PUT - Update category by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { name, questionIds } = body;

    const category = await CategoryModel.findByIdAndUpdate(
      id,
      {
        ...(name !== undefined && { name }),
        ...(questionIds !== undefined && { questionIds }),
      },
      { new: true, runValidators: true }
    );

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: category._id.toString(),
        name: category.name,
        questionIds: category.questionIds,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update category",
      },
      { status: 400 }
    );
  }
}

// DELETE category by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const deletedCategory = await CategoryModel.findByIdAndDelete(id);

    if (!deletedCategory) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: deletedCategory._id.toString(),
        name: deletedCategory.name,
        questionIds: deletedCategory.questionIds,
      },
      message: "Category deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete category",
      },
      { status: 500 }
    );
  }
}
