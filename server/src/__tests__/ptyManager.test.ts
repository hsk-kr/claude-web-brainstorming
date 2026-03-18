import { describe, it, expect, vi, afterEach } from "vitest";

// Capture handlers so we can simulate PTY events
let dataHandler: ((data: string) => void) | null = null;
let exitHandler: ((event: { exitCode: number; signal?: number }) => void) | null = null;

const mockPty = {
  onData: vi.fn((cb) => {
    dataHandler = cb;
    return { dispose: vi.fn() };
  }),
  onExit: vi.fn((cb) => {
    exitHandler = cb;
    return { dispose: vi.fn() };
  }),
  write: vi.fn(),
  resize: vi.fn(),
  kill: vi.fn(),
};

vi.mock("node-pty", () => ({
  spawn: vi.fn(() => mockPty),
}));

import { PtyManager } from "../ptyManager.js";

describe("PtyManager", () => {
  let manager: PtyManager;

  afterEach(() => {
    manager?.dispose();
    vi.clearAllMocks();
    dataHandler = null;
    exitHandler = null;
  });

  it("spawns a PTY process attached to tmux", () => {
    manager = new PtyManager("test-session");
    expect(manager.isAlive()).toBe(true);
  });

  it("invokes data callbacks when PTY emits data", () => {
    manager = new PtyManager("test-session");
    const cb = vi.fn();
    manager.onData(cb);
    dataHandler!("hello");
    expect(cb).toHaveBeenCalledWith("hello");
  });

  it("stops invoking callback after unsubscribe", () => {
    manager = new PtyManager("test-session");
    const cb = vi.fn();
    const unsub = manager.onData(cb);
    unsub();
    dataHandler!("hello");
    expect(cb).not.toHaveBeenCalled();
  });

  it("invokes exit callbacks when PTY exits", () => {
    manager = new PtyManager("test-session");
    const cb = vi.fn();
    manager.onExit(cb);
    exitHandler!({ exitCode: 0, signal: undefined });
    expect(cb).toHaveBeenCalledWith(0, undefined);
    expect(manager.isAlive()).toBe(false);
  });

  it("writes input to the PTY", () => {
    manager = new PtyManager("test-session");
    manager.write("echo hello\r");
    expect(mockPty.write).toHaveBeenCalledWith("echo hello\r");
  });

  it("resizes the PTY", () => {
    manager = new PtyManager("test-session");
    manager.resize(120, 40);
    expect(mockPty.resize).toHaveBeenCalledWith(120, 40);
  });

  it("reports not alive after dispose", () => {
    manager = new PtyManager("test-session");
    manager.dispose();
    expect(manager.isAlive()).toBe(false);
    expect(mockPty.kill).toHaveBeenCalled();
  });

  it("handles write/resize gracefully after dispose", () => {
    manager = new PtyManager("test-session");
    manager.dispose();
    // Should not throw
    manager.write("test");
    manager.resize(80, 24);
  });
});
