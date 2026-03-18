# Claude Brainstorming Tool — Design Spec

**Date:** 2026-03-18
**Status:** Approved

## Overview

A web-based brainstorming and prototyping tool that wraps Claude Code CLI behind a friendly UI. Targeted at team/coworkers who know Claude Code but find the CLI intimidating. Users brainstorm ideas, generate images via Gemini, and create HTML/CSS/JS prototypes — all powered by Claude Code running in a tmux session.

Local tool, single user, one Claude Code session at a time.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Browser (React SPA)                        │
│  ┌──────────┐  ┌────────────┐  ┌─────────┐ │
│  │ Chat     │  │ Terminal   │  │ Preview │ │
│  │ Panel    │  │ (xterm.js) │  │ Panel   │ │
│  └──────────┘  └────────────┘  └─────────┘ │
└──────────────┬──────────────────────────────┘
               │ WebSocket
┌──────────────┴──────────────────────────────┐
│  Node.js Server (Express + ws)              │
│  ┌──────────┐  ┌────────────┐  ┌─────────┐ │
│  │ Session  │  │ PTY        │  │ Gemini  │ │
│  │ Manager  │  │ Manager    │  │ API     │ │
│  └──────────┘  └────────────┘  └─────────┘ │
└──────────────┬──────────────────────────────┘
               │ node-pty
┌──────────────┴──────────────────────────────┐
│  tmux session                               │
│  └─ Claude Code CLI                         │
└─────────────────────────────────────────────┘
```

## UI Layout

Three-panel layout:

- **Chat Panel (left):** High-level brainstorming conversation, idea history, action buttons ("Generate Image", "Create Prototype"), pin/bookmark ideas.
- **Terminal Panel (center):** Full xterm.js terminal showing Claude Code output. Convenience buttons overlaid at the bottom (Accept/Reject, Option 1-4, Cancel). User can also type directly.
- **Preview Panel (right):** Live preview of generated prototypes (iframe) and generated images (gallery). Hot-reloads when files change.

## Terminal Bridge (tmux <-> Browser)

### Server-side flow

1. On session start, server runs `tmux new-session -d -s claude-session`
2. Spawns `node-pty` attached to `tmux attach -t claude-session`
3. PTY output is streamed to the browser via WebSocket
4. Browser input (keystrokes or button clicks) is written back to the PTY
5. On terminal resize, relay new dimensions to the PTY via `pty.resize(cols, rows)`

### Convenience buttons

- **Accept / Reject** — writes `y` or `n` + Enter to the PTY
- **Option 1/2/3/4** — writes the number + Enter
- **Cancel** — sends Ctrl+C
- These are shortcuts — user can always type directly

### Session lifecycle

- Server starts -> creates tmux session -> launches Claude Code
- User closes browser -> tmux session stays alive (can reconnect)
- Server restarts -> re-attaches to existing tmux session if found
- Explicit "End Session" button -> kills the tmux session

### Why tmux

Claude Code has tmux-specific features:
- Agent Teams split-pane mode (each agent gets its own visible pane)
- Auto-detection of tmux environment
- Session persistence across disconnects

## Chat Panel & Brainstorming Flow

The chat panel is a structured UI layer on top of Claude Code, not a separate AI.

- User types an idea or message in the chat panel
- The message gets sent to Claude Code via the terminal PTY (injected as a prompt)
- Claude Code's response appears in the terminal in real-time
- The chat panel stores user messages only — Claude Code's responses are viewed in the terminal panel. The chat panel is an input log + action launcher, not a mirrored conversation view. This avoids the complexity of parsing raw PTY output for AI responses.
- Iterative: user goes back and forth refining ideas, then triggers image generation or prototype creation when ready

## Image Generation (Gemini)

- **Model:** Gemini's Imagen 3 (`imagen-3.0-generate-001`) for image generation
- **Trigger:** User clicks "Generate Image" on a message/idea in the chat panel
- **Prompt:** The user's chat message is used as the base prompt. A prompt editor opens where the user can refine before sending to Gemini.
- **Flow:** Browser -> Node.js server -> Gemini API -> image returned -> displayed in Preview Panel
- Direct API call to Gemini (not through Claude Code) for speed
- Generated images saved locally to `generated-images/`, shown in gallery in Preview Panel
- User can regenerate with tweaked prompts

## Prototype Preview

- **Trigger:** User clicks "Create Prototype" in the chat panel
- **Flow:** Structured prompt sent to Claude Code via PTY (e.g., "Create an HTML/CSS/JS prototype for: [idea]. Save to `prototypes/[name]/index.html`")
- User confirms in terminal as usual
- Server detects new files in `prototypes/` directory via file watcher (chokidar)
- Preview Panel loads the prototype in an iframe
- Hot reload on file changes

## WebSocket Protocol

All messages use a typed envelope format:

```typescript
type WSMessage =
  | { type: "terminal.input"; payload: string }       // client -> server: keystrokes
  | { type: "terminal.output"; payload: string }      // server -> client: PTY data
  | { type: "terminal.resize"; payload: { cols: number; rows: number } }
  | { type: "image.request"; payload: { prompt: string } }
  | { type: "image.ready"; payload: { url: string; path: string } }
  | { type: "image.error"; payload: { message: string } }
  | { type: "file.changed"; payload: { path: string; event: "add" | "change" } }
  | { type: "session.status"; payload: { status: "running" | "stopped" | "error" } }
  | { type: "error"; payload: { message: string } }
```

Single WebSocket connection — acceptable for local single-user use. Message types prevent interleaving ambiguity.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite |
| Terminal | xterm.js + xterm-addon-fit |
| WebSocket | ws (server) + native WebSocket (client) |
| Server | Node.js + Express + TypeScript |
| PTY | node-pty |
| Terminal multiplexer | tmux |
| Image generation | Gemini Imagen 3 API |
| Styling | Tailwind CSS |
| File watching | chokidar |
| Testing | Vitest (unit/integration), Playwright (E2E) |

## Project Structure

```
claude-brainstorming-tool/
├── client/                # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── TerminalPanel.tsx
│   │   │   ├── PreviewPanel.tsx
│   │   │   └── ConvenienceButtons.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useTerminal.ts
│   │   │   └── usePreview.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── index.html
├── server/                # Node.js backend
│   ├── src/
│   │   ├── index.ts
│   │   ├── sessionManager.ts
│   │   ├── ptyManager.ts
│   │   ├── geminiApi.ts
│   │   └── fileWatcher.ts
│   └── package.json
├── prototypes/            # Generated prototypes live here
├── docs/
└── CLAUDE.md
```

## Error Handling

- **tmux session not found:** Server creates a new one on startup, re-creates if killed
- **Claude Code crashes:** Detect process exit via PTY, show error in terminal panel, offer "Restart" button
- **WebSocket disconnect:** Client auto-reconnects, re-attaches to existing session
- **Gemini API failure:** Show error in Preview Panel, allow retry
- **File watcher missed update:** Manual "Refresh Preview" button as fallback

## Testing Strategy

- **Unit tests (Vitest):** Session manager, PTY manager, Gemini API wrapper
- **Integration tests (Vitest):** WebSocket message flow, terminal input/output relay
- **E2E tests (Playwright):** Full flow — type in chat, see terminal output, generate image, preview prototype
