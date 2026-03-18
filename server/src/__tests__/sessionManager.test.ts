import { describe, it, expect, afterEach } from "vitest";
import { SessionManager } from "../sessionManager.js";

describe("SessionManager", () => {
  let manager: SessionManager;
  const testSession = "brainstorm-test";

  afterEach(async () => {
    await manager?.destroy();
  });

  it("creates a new tmux session", async () => {
    manager = new SessionManager(testSession);
    await manager.ensureSession();
    expect(await manager.sessionExists()).toBe(true);
  });

  it("detects existing tmux session and reuses it", async () => {
    manager = new SessionManager(testSession);
    await manager.ensureSession();
    await manager.ensureSession();
    expect(await manager.sessionExists()).toBe(true);
  });

  it("destroys the tmux session", async () => {
    manager = new SessionManager(testSession);
    await manager.ensureSession();
    await manager.destroy();
    expect(await manager.sessionExists()).toBe(false);
  });

  it("launches claude code in the session", async () => {
    manager = new SessionManager(testSession);
    await manager.ensureSession();
    await manager.sendKeys("echo hello");
  });
});
