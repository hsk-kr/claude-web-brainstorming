import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { SessionManager } from "./sessionManager.js";
import { PtyManager } from "./ptyManager.js";
import { GeminiImageGenerator } from "./geminiApi.js";
import { FileWatcher } from "./fileWatcher.js";
import { WSHandler } from "./wsHandler.js";
import { parseWSMessage } from "../../shared/types.js";

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const SESSION_NAME = "claude-brainstorm";

async function main() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });

  // Static file serving for generated images and prototypes
  app.use("/generated-images", express.static(path.resolve("./generated-images")));
  app.use("/prototypes", express.static(path.resolve("./prototypes")));

  // Session setup
  const sessionManager = new SessionManager(SESSION_NAME);
  await sessionManager.ensureSession();

  // Launch Claude Code in the tmux session
  await sessionManager.launchClaudeCode();

  const ptyManager = new PtyManager(SESSION_NAME);
  const gemini = new GeminiImageGenerator(GEMINI_API_KEY);
  const fileWatcher = new FileWatcher([
    path.resolve("./prototypes"),
    path.resolve("./generated-images"),
  ]);
  fileWatcher.start();

  const wsHandler = new WSHandler(ptyManager, gemini, sessionManager);

  // Register PTY and file watcher callbacks ONCE at startup
  // Fan out to all connected WebSocket clients
  ptyManager.onData((data) => {
    const msg = JSON.stringify({ type: "terminal.output", payload: data });
    wss.clients.forEach((ws) => {
      if (ws.readyState === 1) ws.send(msg);
    });
  });

  fileWatcher.onChange((filePath, event) => {
    const msg = JSON.stringify({ type: "file.changed", payload: { path: filePath, event } });
    wss.clients.forEach((ws) => {
      if (ws.readyState === 1) ws.send(msg);
    });
  });

  ptyManager.onExit(() => {
    const msg = JSON.stringify({ type: "session.status", payload: { status: "stopped" } });
    wss.clients.forEach((ws) => {
      if (ws.readyState === 1) ws.send(msg);
    });
  });

  wss.on("connection", (ws) => {
    console.log("Client connected");

    // Send initial session status
    ws.send(JSON.stringify({
      type: "session.status",
      payload: { status: ptyManager.isAlive() ? "running" : "stopped" },
    }));

    // Handle incoming messages
    ws.on("message", async (raw) => {
      const msg = parseWSMessage(raw.toString());
      if (msg) {
        await wsHandler.handle(ws, msg);
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
