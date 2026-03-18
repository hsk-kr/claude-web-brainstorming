// server/src/__tests__/integration.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WSHandler } from "../wsHandler.js";

describe("WebSocket Integration", () => {
  const mockPty = {
    write: vi.fn(),
    resize: vi.fn(),
    onData: vi.fn(),
    onExit: vi.fn(),
    isAlive: vi.fn().mockReturnValue(true),
    dispose: vi.fn(),
  };

  const mockImageGen = {
    generate: vi.fn().mockResolvedValue({ url: "/img/1.png", path: "/tmp/1.png" }),
  };

  const mockWs = {
    send: vi.fn(),
    readyState: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("full flow: input -> pty -> output", async () => {
    const handler = new WSHandler(mockPty as any, mockImageGen as any);

    await handler.handle(mockWs as any, {
      type: "terminal.input",
      payload: "brainstorm a todo app\r",
    });
    expect(mockPty.write).toHaveBeenCalledWith("brainstorm a todo app\r");
  });

  it("full flow: image request -> openai -> response", async () => {
    const handler = new WSHandler(mockPty as any, mockImageGen as any);

    await handler.handle(mockWs as any, {
      type: "image.request",
      payload: { prompt: "a modern todo app UI" },
    });

    expect(mockImageGen.generate).toHaveBeenCalledWith("a modern todo app UI", undefined);
    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "image.ready", payload: { url: "/img/1.png", path: "/tmp/1.png" } })
    );
  });

  it("full flow: image request with model selection", async () => {
    const handler = new WSHandler(mockPty as any, mockImageGen as any);

    await handler.handle(mockWs as any, {
      type: "image.request",
      payload: { prompt: "a cat", model: "dall-e-3" },
    });

    expect(mockImageGen.generate).toHaveBeenCalledWith("a cat", "dall-e-3");
  });

  it("full flow: resize -> pty resize", async () => {
    const handler = new WSHandler(mockPty as any, mockImageGen as any);

    await handler.handle(mockWs as any, {
      type: "terminal.resize",
      payload: { cols: 80, rows: 24 },
    });

    expect(mockPty.resize).toHaveBeenCalledWith(80, 24);
  });
});
