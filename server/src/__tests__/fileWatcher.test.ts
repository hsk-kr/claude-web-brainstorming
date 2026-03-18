import { describe, it, expect, afterEach } from "vitest";
import { FileWatcher } from "../fileWatcher.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("FileWatcher", () => {
  let watcher: FileWatcher;
  let tmpDir: string;

  afterEach(async () => {
    watcher?.stop();
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("detects new files in watched directories", async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "fw-test-"));
    watcher = new FileWatcher([tmpDir]);
    watcher.start();

    const detected = await new Promise<{ path: string; event: string }>((resolve) => {
      watcher.onChange((filePath, event) => {
        resolve({ path: filePath, event });
      });
      setTimeout(async () => {
        await fs.writeFile(path.join(tmpDir, "test.html"), "<h1>hi</h1>");
      }, 200);
    });

    expect(detected.event).toBe("add");
    expect(detected.path).toContain("test.html");
  });

  it("detects file changes", async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "fw-test-"));
    const filePath = path.join(tmpDir, "existing.html");
    await fs.writeFile(filePath, "<h1>v1</h1>");

    watcher = new FileWatcher([tmpDir]);
    watcher.start();

    const detected = await new Promise<{ path: string; event: string }>((resolve) => {
      watcher.onChange((p, event) => {
        if (event === "change") resolve({ path: p, event });
      });
      setTimeout(async () => {
        await fs.writeFile(filePath, "<h1>v2</h1>");
      }, 200);
    });

    expect(detected.event).toBe("change");
  });
});
