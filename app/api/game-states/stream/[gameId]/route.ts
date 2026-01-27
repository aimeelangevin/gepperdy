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
      let lastStateHash = '';

      // Connect to DB once at the start
      await connectDB();

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

      // Poll for changes every 250ms for near real-time updates
      // This balances responsiveness with server load
      const pollInterval = setInterval(async () => {
        if (!isActive) {
          clearInterval(pollInterval);
          return;
        }

        try {
          const gameState = await GameStateModel.findOne({ gameId }).lean();

          if (gameState) {
            // Convert MongoDB document to plain object
            const gameStateData = JSON.parse(JSON.stringify(gameState));
            
            // Create a hash of critical fields that need immediate updates
            const stateHash = JSON.stringify({
              buzzedTeamId: gameStateData.buzzedTeamId,
              state: gameStateData.state,
              updatedAt: gameStateData.updatedAt,
              failedTeamIds: gameStateData.failedTeamIds || []
            });

            // Only send update if something actually changed
            if (stateHash !== lastStateHash) {
              sendMessage({
                type: "update",
                data: gameStateData,
                timestamp: new Date().toISOString(),
              });
              lastStateHash = stateHash;
              lastUpdateTime = new Date(gameState.updatedAt || new Date());
            }
          }
        } catch (error) {
          console.error("Error polling game state:", error);
          sendMessage({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }, 250); // Poll every 250ms for faster updates (4 times per second)

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

