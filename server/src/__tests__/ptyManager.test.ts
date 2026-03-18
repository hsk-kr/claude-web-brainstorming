import { describe, it, expect, vi, afterEach } from "vitest";

// Mock node-pty so tests don't require a live tmux session
const mockPty = {
  onData: vi.fn(),
  onExit: vi.fn(),
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
  });

  it("spawns a PTY process attached to tmux", () => {
    manager = new PtyManager("test-session");
    expect(manager.isAlive()).toBe(true);
  });

  it("returns an unsubscribe function from onData", () => {
    manager = new PtyManager("test-session");
    const cb = vi.fn();
    const unsub = manager.onData(cb);
    expect(typeof unsub).toBe("function");
    unsub();
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
});
