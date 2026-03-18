# Claude Brainstorming Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based brainstorming/prototyping tool that wraps Claude Code CLI in a three-panel UI (chat, terminal, preview) with Gemini image generation.

**Architecture:** Node.js/Express backend manages a tmux session running Claude Code via node-pty. React frontend renders the terminal with xterm.js, provides a chat input panel, and shows prototype/image previews. All communication over a single typed WebSocket.

**Tech Stack:** React, TypeScript, Vite, xterm.js, Tailwind CSS, Node.js, Express, ws, node-pty, chokidar, Gemini Imagen 3 API, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-03-18-brainstorming-tool-design.md`

---

## File Map

### Server (`server/`)

| File | Responsibility |
|------|---------------|
| `server/package.json` | Dependencies and scripts |
| `server/tsconfig.json` | TypeScript config |
| `server/src/ptyManager.ts` | Spawn/attach tmux session via node-pty, read/write PTY |
| `server/src/sessionManager.ts` | Lifecycle: create/destroy/reconnect tmux sessions |
| `server/src/geminiApi.ts` | Gemini Imagen 3 API wrapper |
| `server/src/fileWatcher.ts` | Watch `prototypes/` and `generated-images/` via chokidar |
| `server/src/wsHandler.ts` | WebSocket message routing and dispatch |
| `server/src/index.ts` | Express app, HTTP server, wire everything together |
| `server/src/__tests__/ptyManager.test.ts` | PTY manager unit tests |
| `server/src/__tests__/sessionManager.test.ts` | Session manager unit tests |
| `server/src/__tests__/geminiApi.test.ts` | Gemini API wrapper unit tests |
| `server/src/__tests__/fileWatcher.test.ts` | File watcher unit tests |
| `server/src/__tests__/wsHandler.test.ts` | WebSocket handler integration tests |

### Client (`client/`)

| File | Responsibility |
|------|---------------|
| `client/package.json` | Dependencies and scripts |
| `client/tsconfig.json` | TypeScript config |
| `client/vite.config.ts` | Vite config with WebSocket proxy |
| `client/tailwind.config.js` | Tailwind config |
| `client/postcss.config.js` | PostCSS config for Tailwind |
| `client/index.html` | HTML entry point |
| `client/src/types.ts` | Shared WebSocket message types (mirrors server) |
| `client/src/main.tsx` | React entry point |
| `client/src/App.tsx` | Three-panel layout shell |
| `client/src/hooks/useWebSocket.ts` | WebSocket connection, reconnect, message dispatch |
| `client/src/hooks/useTerminal.ts` | xterm.js lifecycle, resize relay |
| `client/src/hooks/usePreview.ts` | Track prototype/image URLs from file.changed events |
| `client/src/components/ChatPanel.tsx` | Message input, history, action buttons |
| `client/src/components/TerminalPanel.tsx` | xterm.js container + convenience buttons |
| `client/src/components/ConvenienceButtons.tsx` | Accept/Reject/1-4/Cancel button bar |
| `client/src/components/PreviewPanel.tsx` | Iframe for prototypes, image gallery |
| `client/src/components/ImagePromptEditor.tsx` | Modal to refine prompt before Gemini call |

### Root

| File | Responsibility |
|------|---------------|
| `package.json` | Root workspace scripts (dev, build, test) |
| `.gitignore` | Ignore node_modules, dist, generated-images, prototypes |
| `shared/types.ts` | Single source of truth for WSMessage type union |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `.gitignore`, `shared/types.ts`
- Create: `server/package.json`, `server/tsconfig.json`
- Create: `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`
- Create: `client/tailwind.config.js`, `client/postcss.config.js`
- Create: `client/index.html`, `client/src/main.tsx`

- [ ] **Step 1: Create root `package.json` with workspace scripts**

```json
{
  "name": "claude-brainstorming-tool",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "build": "cd client && npm run build",
    "test": "cd server && npm test",
    "test:e2e": "cd client && npx playwright test"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
dist/
.env
generated-images/
prototypes/
*.log
```

- [ ] **Step 3: Create `shared/types.ts` — single source of truth for WS protocol**

```typescript
export type WSMessage =
  | { type: "terminal.input"; payload: string }
  | { type: "terminal.output"; payload: string }
  | { type: "terminal.resize"; payload: { cols: number; rows: number } }
  | { type: "image.request"; payload: { prompt: string } }
  | { type: "image.ready"; payload: { url: string; path: string } }
  | { type: "image.error"; payload: { message: string } }
  | { type: "file.changed"; payload: { path: string; event: "add" | "change" } }
  | { type: "session.status"; payload: { status: "running" | "stopped" | "error" } }
  | { type: "session.end"; payload: null }
  | { type: "error"; payload: { message: string } };

export function parseWSMessage(data: string): WSMessage | null {
  try {
    const msg = JSON.parse(data);
    if (msg && typeof msg.type === "string" && "payload" in msg) {
      return msg as WSMessage;
    }
    return null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Create `server/package.json`**

```json
{
  "name": "claude-brainstorming-server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "express": "^5.1.0",
    "ws": "^8.18.0",
    "node-pty": "^1.0.0",
    "chokidar": "^4.0.0",
    "@google/genai": "^1.0.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/ws": "^8.5.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 5: Create `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "..",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src/**/*", "../shared/**/*"]
}
```

- [ ] **Step 6: Create client with Vite + React + TypeScript + Tailwind**

```bash
cd client
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 7: Add `@shared` path alias to `client/tsconfig.json`**

After Vite scaffolding, add `paths` to the generated `client/tsconfig.json` (or `tsconfig.app.json` if Vite creates that):

```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  }
}
```

Merge this into the existing `compilerOptions` — don't replace the whole file.

- [ ] **Step 8: Configure `client/vite.config.ts` with WS proxy**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    proxy: {
      "/ws": {
        target: "ws://localhost:3001",
        ws: true,
      },
      "/api": {
        target: "http://localhost:3001",
      },
    },
  },
});
```

- [ ] **Step 9: Install root dependencies and verify everything builds**

```bash
npm install
cd server && npm install
cd ../client && npm install
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold project with server, client, and shared types"
```

---

## Task 2: PTY Manager (Server)

**Files:**
- Create: `server/src/ptyManager.ts`
- Create: `server/src/__tests__/ptyManager.test.ts`

- [ ] **Step 1: Write failing test for PTY manager**

```typescript
// server/src/__tests__/ptyManager.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/__tests__/ptyManager.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement PtyManager**

```typescript
// server/src/ptyManager.ts
import * as pty from "node-pty";

type DataCallback = (data: string) => void;
type ExitCallback = (code: number, signal: number | undefined) => void;

export class PtyManager {
  private ptyProcess: pty.IPty | null = null;
  private dataCallbacks: DataCallback[] = [];
  private exitCallbacks: ExitCallback[] = [];

  constructor(private sessionName: string) {
    this.spawn();
  }

  private spawn(): void {
    this.ptyProcess = pty.spawn("tmux", ["attach", "-t", this.sessionName], {
      name: "xterm-256color",
      cols: 120,
      rows: 40,
      cwd: process.cwd(),
      env: process.env as Record<string, string>,
    });

    this.ptyProcess.onData((data) => {
      this.dataCallbacks.forEach((cb) => cb(data));
    });

    this.ptyProcess.onExit(({ exitCode, signal }) => {
      this.exitCallbacks.forEach((cb) => cb(exitCode, signal));
      this.ptyProcess = null;
    });
  }

  /** Returns an unsubscribe function */
  onData(callback: DataCallback): () => void {
    this.dataCallbacks.push(callback);
    return () => {
      this.dataCallbacks = this.dataCallbacks.filter((cb) => cb !== callback);
    };
  }

  /** Returns an unsubscribe function */
  onExit(callback: ExitCallback): () => void {
    this.exitCallbacks.push(callback);
    return () => {
      this.exitCallbacks = this.exitCallbacks.filter((cb) => cb !== callback);
    };
  }

  write(data: string): void {
    this.ptyProcess?.write(data);
  }

  resize(cols: number, rows: number): void {
    this.ptyProcess?.resize(cols, rows);
  }

  isAlive(): boolean {
    return this.ptyProcess !== null;
  }

  dispose(): void {
    this.ptyProcess?.kill();
    this.ptyProcess = null;
    this.dataCallbacks = [];
    this.exitCallbacks = [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/__tests__/ptyManager.test.ts`
Expected: PASS (node-pty is mocked, no live tmux required)

- [ ] **Step 5: Commit**

```bash
git add server/src/ptyManager.ts server/src/__tests__/ptyManager.test.ts
git commit -m "feat: add PtyManager for tmux PTY bridge"
```

---

## Task 3: Session Manager (Server)

**Files:**
- Create: `server/src/sessionManager.ts`
- Create: `server/src/__tests__/sessionManager.test.ts`

- [ ] **Step 1: Write failing test for Session Manager**

```typescript
// server/src/__tests__/sessionManager.test.ts
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
    // Call again — should not throw
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
    // sendKeys should not throw
    await manager.sendKeys("echo hello");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/__tests__/sessionManager.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement SessionManager**

```typescript
// server/src/sessionManager.ts
import { execSync, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class SessionManager {
  constructor(private sessionName: string = "claude-brainstorm") {}

  async sessionExists(): Promise<boolean> {
    try {
      await execAsync(`tmux has-session -t ${this.sessionName}`);
      return true;
    } catch {
      return false;
    }
  }

  async ensureSession(): Promise<void> {
    const exists = await this.sessionExists();
    if (!exists) {
      await execAsync(
        `tmux new-session -d -s ${this.sessionName} -x 120 -y 40`
      );
    }
  }

  async launchClaudeCode(workingDir?: string): Promise<void> {
    const cwd = workingDir || process.cwd();
    await this.sendKeys(`cd ${cwd} && claude`);
  }

  async sendKeys(command: string): Promise<void> {
    await execAsync(
      `tmux send-keys -t ${this.sessionName} '${command}' Enter`
    );
  }

  async destroy(): Promise<void> {
    try {
      await execAsync(`tmux kill-session -t ${this.sessionName}`);
    } catch {
      // Session already gone
    }
  }

  getSessionName(): string {
    return this.sessionName;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/__tests__/sessionManager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/sessionManager.ts server/src/__tests__/sessionManager.test.ts
git commit -m "feat: add SessionManager for tmux lifecycle"
```

---

## Task 4: Gemini API Wrapper (Server)

**Files:**
- Create: `server/src/geminiApi.ts`
- Create: `server/src/__tests__/geminiApi.test.ts`

- [ ] **Step 1: Write failing test for Gemini API wrapper**

```typescript
// server/src/__tests__/geminiApi.test.ts
import { describe, it, expect, vi } from "vitest";
import { GeminiImageGenerator } from "../geminiApi.js";

// Mock the @google/genai module
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateImages: vi.fn().mockResolvedValue({
        generatedImages: [
          {
            image: {
              imageBytes: Buffer.from("fake-image-data").toString("base64"),
            },
          },
        ],
      }),
    },
  })),
}));

describe("GeminiImageGenerator", () => {
  it("generates an image and saves to disk", async () => {
    const generator = new GeminiImageGenerator("fake-api-key", "/tmp/test-images");
    const result = await generator.generate("a cat wearing a hat");

    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("path");
    expect(result.path).toContain("/tmp/test-images/");
    expect(result.path).toMatch(/\.png$/);
  });

  it("throws on empty prompt", async () => {
    const generator = new GeminiImageGenerator("fake-api-key", "/tmp/test-images");
    await expect(generator.generate("")).rejects.toThrow("Prompt cannot be empty");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/__tests__/geminiApi.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement GeminiImageGenerator**

```typescript
// server/src/geminiApi.ts
import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export class GeminiImageGenerator {
  private client: GoogleGenAI;

  constructor(
    apiKey: string,
    private outputDir: string = "./generated-images"
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate(prompt: string): Promise<{ url: string; path: string }> {
    if (!prompt.trim()) {
      throw new Error("Prompt cannot be empty");
    }

    await fs.mkdir(this.outputDir, { recursive: true });

    const response = await this.client.models.generateImages({
      model: "imagen-3.0-generate-001",
      prompt,
      config: { numberOfImages: 1 },
    });

    const imageData = response.generatedImages?.[0]?.image?.imageBytes;
    if (!imageData) {
      throw new Error("No image data in response");
    }

    const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.png`;
    const filePath = path.join(this.outputDir, filename);
    await fs.writeFile(filePath, Buffer.from(imageData, "base64"));

    return {
      url: `/generated-images/${filename}`,
      path: filePath,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/__tests__/geminiApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/geminiApi.ts server/src/__tests__/geminiApi.test.ts
git commit -m "feat: add Gemini Imagen 3 API wrapper"
```

---

## Task 5: File Watcher (Server)

**Files:**
- Create: `server/src/fileWatcher.ts`
- Create: `server/src/__tests__/fileWatcher.test.ts`

- [ ] **Step 1: Write failing test for FileWatcher**

```typescript
// server/src/__tests__/fileWatcher.test.ts
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
      // Create a file after a short delay to ensure watcher is ready
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/__tests__/fileWatcher.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement FileWatcher**

```typescript
// server/src/fileWatcher.ts
import chokidar from "chokidar";

type ChangeCallback = (path: string, event: "add" | "change") => void;

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private callbacks: ChangeCallback[] = [];

  constructor(private watchPaths: string[]) {}

  start(): void {
    this.watcher = chokidar.watch(this.watchPaths, {
      ignoreInitial: true,
      persistent: true,
    });

    this.watcher.on("add", (path) => {
      this.callbacks.forEach((cb) => cb(path, "add"));
    });

    this.watcher.on("change", (path) => {
      this.callbacks.forEach((cb) => cb(path, "change"));
    });
  }

  /** Returns an unsubscribe function */
  onChange(callback: ChangeCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    this.callbacks = [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/__tests__/fileWatcher.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/fileWatcher.ts server/src/__tests__/fileWatcher.test.ts
git commit -m "feat: add FileWatcher for prototype hot-reload"
```

---

## Task 6: WebSocket Handler (Server)

**Files:**
- Create: `server/src/wsHandler.ts`
- Create: `server/src/__tests__/wsHandler.test.ts`

- [ ] **Step 1: Write failing test for WebSocket handler**

```typescript
// server/src/__tests__/wsHandler.test.ts
import { describe, it, expect, vi } from "vitest";
import { WSHandler } from "../wsHandler.js";
import type { WSMessage } from "../../shared/types.js";

// Create mock dependencies
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

function createMockWs() {
  return {
    send: vi.fn(),
    readyState: 1, // OPEN
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/__tests__/wsHandler.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement WSHandler**

```typescript
// server/src/wsHandler.ts
import type { WebSocket } from "ws";
import type { PtyManager } from "./ptyManager.js";
import type { GeminiImageGenerator } from "./geminiApi.js";
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
    private gemini: GeminiImageGenerator,
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
          const result = await this.gemini.generate(msg.payload.prompt);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/__tests__/wsHandler.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/wsHandler.ts server/src/__tests__/wsHandler.test.ts
git commit -m "feat: add WebSocket message handler with routing"
```

---

## Task 7: Server Entry Point

**Files:**
- Create: `server/src/index.ts`

- [ ] **Step 1: Implement server entry point wiring everything together**

```typescript
// server/src/index.ts
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

  const ptyManager = new PtyManager(SESSION_NAME);
  const gemini = new GeminiImageGenerator(GEMINI_API_KEY);
  const fileWatcher = new FileWatcher([
    path.resolve("./prototypes"),
    path.resolve("./generated-images"),
  ]);
  fileWatcher.start();

  // Launch Claude Code in the tmux session
  await sessionManager.launchClaudeCode();

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
```

- [ ] **Step 2: Verify server starts without errors**

Run: `cd server && GEMINI_API_KEY=test npx tsx src/index.ts`
Expected: "Server running on http://localhost:3001" (then Ctrl+C to stop)

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: add server entry point wiring all components"
```

---

## Task 8: useWebSocket Hook (Client)

**Files:**
- Create: `client/src/hooks/useWebSocket.ts`
- Create: `client/src/types.ts` (re-export from shared)

- [ ] **Step 1: Create client types re-export**

```typescript
// client/src/types.ts
export type { WSMessage } from "@shared/types";
export { parseWSMessage } from "@shared/types";
```

- [ ] **Step 2: Implement useWebSocket hook**

```typescript
// client/src/hooks/useWebSocket.ts
import { useRef, useEffect, useCallback, useState } from "react";
import type { WSMessage } from "../types";
import { parseWSMessage } from "../types";

type MessageHandler = (msg: WSMessage) => void;

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<MessageHandler[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (event) => {
        const msg = parseWSMessage(event.data);
        if (msg) {
          handlersRef.current.forEach((h) => h(msg));
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Auto-reconnect after 2 seconds
        setTimeout(connect, 2000);
      };
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [url]);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const addHandler = useCallback((handler: MessageHandler) => {
    handlersRef.current.push(handler);
    return () => {
      handlersRef.current = handlersRef.current.filter((h) => h !== handler);
    };
  }, []);

  return { send, addHandler, connected };
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/types.ts client/src/hooks/useWebSocket.ts
git commit -m "feat: add useWebSocket hook with auto-reconnect"
```

---

## Task 9: useTerminal Hook (Client)

**Files:**
- Create: `client/src/hooks/useTerminal.ts`

- [ ] **Step 1: Install xterm.js dependencies**

```bash
cd client && npm install @xterm/xterm @xterm/addon-fit
```

- [ ] **Step 2: Implement useTerminal hook**

```typescript
// client/src/hooks/useTerminal.ts
import { useRef, useEffect, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import type { WSMessage } from "../types";

interface UseTerminalOptions {
  send: (msg: WSMessage) => void;
  addHandler: (handler: (msg: WSMessage) => void) => () => void;
}

export function useTerminal({ send, addHandler }: UseTerminalOptions) {
  const termRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!termRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      theme: {
        background: "#1a1b26",
        foreground: "#a9b1d6",
        cursor: "#c0caf5",
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(termRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Send terminal input to server
    terminal.onData((data) => {
      send({ type: "terminal.input", payload: data });
    });

    // Send resize events
    terminal.onResize(({ cols, rows }) => {
      send({ type: "terminal.resize", payload: { cols, rows } });
    });

    // Receive terminal output from server
    const removeHandler = addHandler((msg) => {
      if (msg.type === "terminal.output") {
        terminal.write(msg.payload);
      }
    });

    // Handle window resize
    const onResize = () => fitAddon.fit();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      removeHandler();
      terminal.dispose();
    };
  }, [send, addHandler]);

  const fit = useCallback(() => {
    fitAddonRef.current?.fit();
  }, []);

  return { termRef, fit };
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useTerminal.ts
git commit -m "feat: add useTerminal hook with xterm.js and resize relay"
```

---

## Task 10: usePreview Hook (Client)

**Files:**
- Create: `client/src/hooks/usePreview.ts`

- [ ] **Step 1: Implement usePreview hook**

```typescript
// client/src/hooks/usePreview.ts
import { useState, useEffect, useCallback } from "react";
import type { WSMessage } from "../types";

interface PreviewState {
  prototypeUrl: string | null;
  images: Array<{ url: string; path: string }>;
  refreshKey: number;
}

interface UsePreviewOptions {
  addHandler: (handler: (msg: WSMessage) => void) => () => void;
}

export function usePreview({ addHandler }: UsePreviewOptions) {
  const [state, setState] = useState<PreviewState>({
    prototypeUrl: null,
    images: [],
    refreshKey: 0,
  });

  useEffect(() => {
    const removeHandler = addHandler((msg) => {
      if (msg.type === "file.changed") {
        const filePath = msg.payload.path;
        if (filePath.includes("prototypes/") && filePath.endsWith(".html")) {
          // Extract relative URL for iframe
          const relative = filePath.substring(filePath.indexOf("prototypes/"));
          setState((prev) => ({
            ...prev,
            prototypeUrl: `/${relative}`,
            refreshKey: prev.refreshKey + 1,
          }));
        }
      }

      if (msg.type === "image.ready") {
        setState((prev) => ({
          ...prev,
          images: [...prev.images, msg.payload],
        }));
      }
    });

    return removeHandler;
  }, [addHandler]);

  const refreshPreview = useCallback(() => {
    setState((prev) => ({ ...prev, refreshKey: prev.refreshKey + 1 }));
  }, []);

  return { ...state, refreshPreview };
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/usePreview.ts
git commit -m "feat: add usePreview hook for prototype and image tracking"
```

---

## Task 11: ConvenienceButtons Component (Client)

**Files:**
- Create: `client/src/components/ConvenienceButtons.tsx`

- [ ] **Step 1: Implement ConvenienceButtons**

```tsx
// client/src/components/ConvenienceButtons.tsx
import type { WSMessage } from "../types";

interface ConvenienceButtonsProps {
  send: (msg: WSMessage) => void;
}

export function ConvenienceButtons({ send }: ConvenienceButtonsProps) {
  const sendInput = (text: string) => {
    send({ type: "terminal.input", payload: text });
  };

  return (
    <div className="flex gap-2 p-2 bg-gray-900/80 backdrop-blur border-t border-gray-700">
      <button
        onClick={() => sendInput("y\r")}
        className="px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
      >
        Accept (y)
      </button>
      <button
        onClick={() => sendInput("n\r")}
        className="px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
      >
        Reject (n)
      </button>

      <div className="w-px bg-gray-600 mx-1" />

      {[1, 2, 3, 4].map((n) => (
        <button
          key={n}
          onClick={() => sendInput(`${n}\r`)}
          className="px-3 py-1.5 text-sm font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
        >
          {n}
        </button>
      ))}

      <div className="w-px bg-gray-600 mx-1" />

      <button
        onClick={() => sendInput("\x03")}
        className="px-3 py-1.5 text-sm font-medium bg-yellow-600 hover:bg-yellow-500 text-white rounded transition-colors"
      >
        Cancel (^C)
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ConvenienceButtons.tsx
git commit -m "feat: add ConvenienceButtons for terminal shortcuts"
```

---

## Task 12: TerminalPanel Component (Client)

**Files:**
- Create: `client/src/components/TerminalPanel.tsx`

- [ ] **Step 1: Implement TerminalPanel**

```tsx
// client/src/components/TerminalPanel.tsx
import { useEffect } from "react";
import { useTerminal } from "../hooks/useTerminal";
import { ConvenienceButtons } from "./ConvenienceButtons";
import type { WSMessage } from "../types";
import "@xterm/xterm/css/xterm.css";

interface TerminalPanelProps {
  send: (msg: WSMessage) => void;
  addHandler: (handler: (msg: WSMessage) => void) => () => void;
}

export function TerminalPanel({ send, addHandler }: TerminalPanelProps) {
  const { termRef, fit } = useTerminal({ send, addHandler });

  // Re-fit when panel is resized
  useEffect(() => {
    const observer = new ResizeObserver(() => fit());
    if (termRef.current) {
      observer.observe(termRef.current);
    }
    return () => observer.disconnect();
  }, [fit, termRef]);

  return (
    <div className="flex flex-col h-full bg-[#1a1b26]">
      <div className="flex-1 min-h-0" ref={termRef} />
      <ConvenienceButtons send={send} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/TerminalPanel.tsx
git commit -m "feat: add TerminalPanel with xterm.js and convenience buttons"
```

---

## Task 13: ChatPanel Component (Client)

**Files:**
- Create: `client/src/components/ChatPanel.tsx`
- Create: `client/src/components/ImagePromptEditor.tsx`

- [ ] **Step 1: Implement ImagePromptEditor**

```tsx
// client/src/components/ImagePromptEditor.tsx
import { useState } from "react";

interface ImagePromptEditorProps {
  initialPrompt: string;
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
}

export function ImagePromptEditor({ initialPrompt, onSubmit, onCancel }: ImagePromptEditorProps) {
  const [prompt, setPrompt] = useState(initialPrompt);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4">
        <h3 className="text-lg font-semibold text-white mb-3">Generate Image</h3>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full h-32 bg-gray-900 text-white rounded p-3 text-sm resize-none border border-gray-600 focus:border-blue-500 focus:outline-none"
          placeholder="Describe the image you want to generate..."
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(prompt)}
            disabled={!prompt.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement ChatPanel**

```tsx
// client/src/components/ChatPanel.tsx
import { useState, useRef, useEffect } from "react";
import { ImagePromptEditor } from "./ImagePromptEditor";
import type { WSMessage } from "../types";

interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  pinned: boolean;
}

interface ChatPanelProps {
  send: (msg: WSMessage) => void;
}

export function ChatPanel({ send }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [imageEditor, setImageEditor] = useState<{ prompt: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      text,
      timestamp: new Date(),
      pinned: false,
    };

    setMessages((prev) => [...prev, msg]);
    setInput("");

    // Send to Claude Code via terminal
    send({ type: "terminal.input", payload: text + "\r" });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const togglePin = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m))
    );
  };

  const createPrototype = (text: string) => {
    // Derive a short slug from the first few words of the idea
    const slug = text.split(/\s+/).slice(0, 3).join("-").toLowerCase().replace(/[^a-z0-9-]/g, "");
    const name = slug || `prototype-${Date.now()}`;
    const prompt = `Create an HTML/CSS/JS prototype for the following idea. Save it to prototypes/${name}/index.html:\n\n${text}`;
    send({ type: "terminal.input", payload: prompt + "\r" });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Brainstorm
        </h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg ${msg.pinned ? "bg-yellow-900/30 border border-yellow-700/50" : "bg-gray-800"}`}
          >
            <p className="text-sm text-gray-200 whitespace-pre-wrap">{msg.text}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">
                {msg.timestamp.toLocaleTimeString()}
              </span>
              <button
                onClick={() => togglePin(msg.id)}
                className="text-xs text-gray-500 hover:text-yellow-400 transition-colors"
              >
                {msg.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => setImageEditor({ prompt: msg.text })}
                className="text-xs text-gray-500 hover:text-blue-400 transition-colors"
              >
                Generate Image
              </button>
              <button
                onClick={() => createPrototype(msg.text)}
                className="text-xs text-gray-500 hover:text-green-400 transition-colors"
              >
                Create Prototype
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="flex-1 bg-gray-800 text-white rounded-lg p-3 text-sm resize-none border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="Type your idea... (Enter to send)"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="self-end px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* Image Prompt Editor Modal */}
      {imageEditor && (
        <ImagePromptEditor
          initialPrompt={imageEditor.prompt}
          onSubmit={(prompt) => {
            send({ type: "image.request", payload: { prompt } });
            setImageEditor(null);
          }}
          onCancel={() => setImageEditor(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ChatPanel.tsx client/src/components/ImagePromptEditor.tsx
git commit -m "feat: add ChatPanel with message history, actions, and image prompt editor"
```

---

## Task 14: PreviewPanel Component (Client)

**Files:**
- Create: `client/src/components/PreviewPanel.tsx`

- [ ] **Step 1: Implement PreviewPanel**

```tsx
// client/src/components/PreviewPanel.tsx
interface PreviewPanelProps {
  prototypeUrl: string | null;
  images: Array<{ url: string; path: string }>;
  refreshKey: number;
  onRefresh: () => void;
}

export function PreviewPanel({ prototypeUrl, images, refreshKey, onRefresh }: PreviewPanelProps) {
  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Preview
        </h2>
        <button
          onClick={onRefresh}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Prototype iframe */}
      {prototypeUrl && (
        <div className="flex-1 min-h-0 border-b border-gray-700">
          <iframe
            key={refreshKey}
            src={prototypeUrl}
            className="w-full h-full bg-white"
            sandbox="allow-scripts allow-same-origin"
            title="Prototype Preview"
          />
        </div>
      )}

      {/* Image gallery */}
      {images.length > 0 && (
        <div className={`${prototypeUrl ? "h-48" : "flex-1"} overflow-y-auto p-3`}>
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
            Generated Images
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {images.map((img, i) => (
              <img
                key={i}
                src={img.url}
                alt={`Generated ${i + 1}`}
                className="w-full rounded border border-gray-700"
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!prototypeUrl && images.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
          Prototypes and images will appear here
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/PreviewPanel.tsx
git commit -m "feat: add PreviewPanel with iframe and image gallery"
```

---

## Task 15: App Shell — Three-Panel Layout (Client)

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/main.tsx`

- [ ] **Step 1: Implement App.tsx with three-panel layout**

```tsx
// client/src/App.tsx
import { useWebSocket } from "./hooks/useWebSocket";
import { usePreview } from "./hooks/usePreview";
import { ChatPanel } from "./components/ChatPanel";
import { TerminalPanel } from "./components/TerminalPanel";
import { PreviewPanel } from "./components/PreviewPanel";

const WS_URL = `ws://${window.location.host}/ws`;

export default function App() {
  const { send, addHandler, connected } = useWebSocket(WS_URL);
  const { prototypeUrl, images, refreshKey, refreshPreview } = usePreview({ addHandler });

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Status bar */}
      <div className="h-8 flex items-center px-4 bg-gray-900 border-b border-gray-800 text-xs">
        <span className="font-semibold text-gray-300">Claude Brainstorm</span>
        <span className="ml-auto flex items-center gap-3">
          <button
            onClick={() => {
              if (confirm("End the Claude Code session?")) {
                send({ type: "session.end", payload: null });
              }
            }}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            End Session
          </button>
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-gray-400">
              {connected ? "Connected" : "Disconnected"}
            </span>
          </span>
        </span>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex min-h-0">
        {/* Chat Panel — left */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800">
          <ChatPanel send={send} />
        </div>

        {/* Terminal Panel — center */}
        <div className="flex-1 min-w-0">
          <TerminalPanel send={send} addHandler={addHandler} />
        </div>

        {/* Preview Panel — right */}
        <div className="w-96 flex-shrink-0 border-l border-gray-800">
          <PreviewPanel
            prototypeUrl={prototypeUrl}
            images={images}
            refreshKey={refreshKey}
            onRefresh={refreshPreview}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update main.tsx entry point**

```tsx
// client/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 3: Ensure `client/src/index.css` imports Tailwind**

```css
@import "tailwindcss";
```

- [ ] **Step 4: Verify the client builds**

Run: `cd client && npm run build`
Expected: Build succeeds without errors

- [ ] **Step 5: Commit**

```bash
git add client/src/App.tsx client/src/main.tsx client/src/index.css
git commit -m "feat: add three-panel App shell with status bar"
```

---

## Task 16: Integration Test — Full WebSocket Flow

**Files:**
- Create: `server/src/__tests__/integration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
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

  const mockGemini = {
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
    const handler = new WSHandler(mockPty as any, mockGemini as any);

    // User sends input
    await handler.handle(mockWs as any, {
      type: "terminal.input",
      payload: "brainstorm a todo app\r",
    });
    expect(mockPty.write).toHaveBeenCalledWith("brainstorm a todo app\r");
  });

  it("full flow: image request -> gemini -> response", async () => {
    const handler = new WSHandler(mockPty as any, mockGemini as any);

    await handler.handle(mockWs as any, {
      type: "image.request",
      payload: { prompt: "a modern todo app UI" },
    });

    expect(mockGemini.generate).toHaveBeenCalledWith("a modern todo app UI");
    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "image.ready", payload: { url: "/img/1.png", path: "/tmp/1.png" } })
    );
  });

  it("full flow: resize -> pty resize", async () => {
    const handler = new WSHandler(mockPty as any, mockGemini as any);

    await handler.handle(mockWs as any, {
      type: "terminal.resize",
      payload: { cols: 80, rows: 24 },
    });

    expect(mockPty.resize).toHaveBeenCalledWith(80, 24);
  });
});
```

- [ ] **Step 2: Run integration tests**

Run: `cd server && npx vitest run src/__tests__/integration.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/__tests__/integration.test.ts
git commit -m "test: add WebSocket integration tests"
```

---

## Task 17: End-to-End Smoke Test

**Files:**
- Create: `client/e2e/smoke.spec.ts`
- Create: `client/playwright.config.ts`

- [ ] **Step 1: Install Playwright**

```bash
cd client && npm install -D @playwright/test && npx playwright install chromium
```

- [ ] **Step 2: Create Playwright config**

```typescript
// client/playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:5173",
  },
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 3: Write E2E smoke test**

```typescript
// client/e2e/smoke.spec.ts
import { test, expect } from "@playwright/test";

test("app loads with three panels", async ({ page }) => {
  await page.goto("/");

  // Status bar visible
  await expect(page.getByText("Claude Brainstorm")).toBeVisible();

  // Chat panel visible
  await expect(page.getByText("Brainstorm")).toBeVisible();
  await expect(page.getByPlaceholder("Type your idea")).toBeVisible();

  // Preview panel visible
  await expect(page.getByText("Preview")).toBeVisible();

  // Convenience buttons visible
  await expect(page.getByText("Accept (y)")).toBeVisible();
  await expect(page.getByText("Reject (n)")).toBeVisible();
  await expect(page.getByText("Cancel (^C)")).toBeVisible();
});

test("chat panel sends messages", async ({ page }) => {
  await page.goto("/");

  const input = page.getByPlaceholder("Type your idea");
  await input.fill("Build a todo app");
  await input.press("Enter");

  // Message should appear in chat history
  await expect(page.getByText("Build a todo app")).toBeVisible();
  // Action buttons should appear
  await expect(page.getByText("Generate Image")).toBeVisible();
  await expect(page.getByText("Create Prototype")).toBeVisible();
});
```

- [ ] **Step 4: Commit**

```bash
git add client/e2e/ client/playwright.config.ts
git commit -m "test: add Playwright E2E smoke tests"
```

---

## Task 18: Update CLAUDE.md and Final Cleanup

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md with final project details**

Update `CLAUDE.md` with:
- Actual tech stack and versions
- How to run: `npm run dev` (starts both server and client)
- How to test: `npm test` (server unit/integration), `npm run test:e2e` (Playwright)
- Environment variables: `GEMINI_API_KEY` required for image generation
- Architecture overview matching what was built
- Conventions: TypeScript strict mode, Vitest for tests, Tailwind for styling

- [ ] **Step 2: Verify full dev setup works**

```bash
# Terminal 1: ensure tmux session exists
tmux new-session -d -s claude-brainstorm

# Terminal 2: start dev
npm run dev
```

Expected: Server on :3001, client on :5173, terminal connects, three-panel UI loads.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with setup and conventions"
```
