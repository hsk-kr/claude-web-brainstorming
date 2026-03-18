import type { WebSocket } from "ws";
import type { PtyManager } from "./ptyManager.js";
import type { ImageGenerator } from "./imageApi.js";
import type { SessionManager } from "./sessionManager.js";
import type { WSMessage } from "../../shared/types.js";

function send(ws: WebSocket, msg: WSMessage): void {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(msg));
  }
}

export class WSHandler {
  private sessionManager: SessionManager | null = null;

  constructor(
    private pty: PtyManager,
    private imageGenerator: ImageGenerator,
    sessionManager?: SessionManager
  ) {
    this.sessionManager = sessionManager ?? null;
  }

  async handle(ws: WebSocket, msg: WSMessage): Promise<void> {
    switch (msg.type) {
      case "terminal.input":
        this.pty.write(msg.payload);
        break;

      case "terminal.resize":
        this.pty.resize(msg.payload.cols, msg.payload.rows);
        break;

      case "image.request":
        try {
          const result = await this.imageGenerator.generate(
            msg.payload.prompt,
            (msg.payload.model as any) || undefined
          );
          send(ws, { type: "image.ready", payload: result });
        } catch (err) {
          send(ws, {
            type: "image.error",
            payload: { message: err instanceof Error ? err.message : "Unknown error" },
          });
        }
        break;

      case "session.end":
        this.pty.dispose();
        await this.sessionManager?.destroy();
        send(ws, { type: "session.status", payload: { status: "stopped" } });
        break;
    }
  }
}
