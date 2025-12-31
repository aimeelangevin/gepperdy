import { NextRequest } from "next/server";
import connectDB from "@/lib/db";
import GameStateModel from "@/models/GameState";

// SSE endpoint for streaming game state updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let lastUpdateTime = new Date();
      let isActive = true;

      // Helper function to send SSE message
      const sendMessage = (data: any) => {
        if (!isActive) return;
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error("Error sending SSE message:", error);
        }
      };

      // Send initial connection message
      sendMessage({ type: "connected" });

      // Poll for changes every 500ms
      const pollInterval = setInterval(async () => {
        if (!isActive) {
          clearInterval(pollInterval);
          return;
        }

        try {
          await connectDB();
          const gameState = await GameStateModel.findOne({ gameId }).lean();

          if (gameState) {
            // Convert MongoDB document to plain object
            // JSON.stringify will automatically convert ObjectId to string, but we need to ensure nested objects are serialized
            const gameStateData = JSON.parse(JSON.stringify(gameState));

            // Send update (client will handle deduplication if needed)
            sendMessage({
              type: "update",
              data: gameStateData,
              timestamp: new Date().toISOString(),
            });

            lastUpdateTime = new Date(gameState.updatedAt || new Date());
          }
        } catch (error) {
          console.error("Error polling game state:", error);
          sendMessage({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }, 500); // Poll every 500ms for near real-time updates

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        isActive = false;
        clearInterval(pollInterval);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });

      // Keep-alive ping every 30 seconds
      const keepAliveInterval = setInterval(() => {
        if (!isActive) {
          clearInterval(keepAliveInterval);
          return;
        }
        sendMessage({ type: "ping" });
      }, 30000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAliveInterval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable buffering in nginx
    },
  });
}

