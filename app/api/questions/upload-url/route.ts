import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { GetUploadUrlRequest, GetUploadUrlResponse } from "@/types/api";

const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;

if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_S3_BUCKET) {
  throw new Error(
    "Missing AWS configuration. Please set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET in .env.local"
  );
}

// Create S3 client (singleton pattern for Next.js serverless)
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

// POST - Generate presigned URL for uploading media file
export async function POST(request: Request) {
  try {
    const body: GetUploadUrlRequest = await request.json();
    const { fileName, fileType } = body;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { success: false, error: "fileName and fileType are required" },
        { status: 400 }
      );
    }

    // Generate a unique filename using UUID
    const fileExtension = fileName.split(".").pop() || "";
    const uuid = crypto.randomUUID();
    const s3Key = `${uuid}.${fileExtension}`;

    // Create the command for PUT operation
    const command = new PutObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: s3Key,
      ContentType: fileType,
    });

    // Generate presigned URL (valid for 1 hour)
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    // Construct the object URL where the file will be accessible
    const objectUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;

    const responseData: GetUploadUrlResponse = {
      presignedUrl,
      objectUrl,
      key: s3Key,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate upload URL",
      },
      { status: 500 }
    );
  }
}

