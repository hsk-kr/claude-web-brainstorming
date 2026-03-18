import { describe, it, expect, vi } from "vitest";
import { WSHandler } from "../wsHandler.js";
import type { WSMessage } from "../../../shared/types.js";

function createMockPty() {
  return {
    write: vi.fn(),
    resize: vi.fn(),
    onData: vi.fn(),
    onExit: vi.fn(),
    isAlive: vi.fn().mockReturnValue(true),
    dispose: vi.fn(),
  };
}

function createMockGemini() {
  return {
    generate: vi.fn().mockResolvedValue({ url: "/img/test.png", path: "/tmp/test.png" }),
  };
}

function createMockSession() {
  return {
    destroy: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockWs() {
  return {
    send: vi.fn(),
    readyState: 1,
  };
}

describe("WSHandler", () => {
  it("routes terminal.input to pty.write", () => {
    const pty = createMockPty();
    const gemini = createMockGemini();
    const ws = createMockWs();
    const handler = new WSHandler(pty as any, gemini as any);

    const msg: WSMessage = { type: "terminal.input", payload: "hello" };
    handler.handle(ws as any, msg);

    expect(pty.write).toHaveBeenCalledWith("hello");
  });

  it("routes terminal.resize to pty.resize", () => {
    const pty = createMockPty();
    const gemini = createMockGemini();
    const ws = createMockWs();
    const handler = new WSHandler(pty as any, gemini as any);

    const msg: WSMessage = { type: "terminal.resize", payload: { cols: 100, rows: 30 } };
    handler.handle(ws as any, msg);

    expect(pty.resize).toHaveBeenCalledWith(100, 30);
  });

  it("routes image.request to gemini and sends image.ready", async () => {
    const pty = createMockPty();
    const gemini = createMockGemini();
    const ws = createMockWs();
    const handler = new WSHandler(pty as any, gemini as any);

    const msg: WSMessage = { type: "image.request", payload: { prompt: "a cat" } };
    await handler.handle(ws as any, msg);

    expect(gemini.generate).toHaveBeenCalledWith("a cat");
    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "image.ready", payload: { url: "/img/test.png", path: "/tmp/test.png" } })
    );
  });

  it("sends image.error on gemini failure", async () => {
    const pty = createMockPty();
    const gemini = createMockGemini();
    gemini.generate.mockRejectedValue(new Error("API down"));
    const ws = createMockWs();
    const handler = new WSHandler(pty as any, gemini as any);

    const msg: WSMessage = { type: "image.request", payload: { prompt: "a cat" } };
    await handler.handle(ws as any, msg);

    expect(ws.send).toHaveBeenCalledWith(
      expect.stringContaining("image.error")
    );
  });

  it("handles session.end by disposing pty and destroying session", async () => {
    const pty = createMockPty();
    const gemini = createMockGemini();
    const session = createMockSession();
    const ws = createMockWs();
    const handler = new WSHandler(pty as any, gemini as any, session as any);

    const msg: WSMessage = { type: "session.end", payload: null };
    await handler.handle(ws as any, msg);

    expect(pty.dispose).toHaveBeenCalled();
    expect(session.destroy).toHaveBeenCalled();
    expect(ws.send).toHaveBeenCalledWith(
      expect.stringContaining("session.status")
    );
  });
});
