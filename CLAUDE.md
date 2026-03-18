# Claude Brainstorming Tool

## Status: Initial Implementation Complete (2026-03-18)

A web-based brainstorming and prototyping tool that wraps Claude Code CLI behind a friendly UI. Non-technical users can brainstorm ideas, generate images (via OpenAI), and create prototypes — all powered by Claude Code running in the background.

## Tech Stack

- **Client:** React 19, TypeScript, Vite 6, xterm.js, Tailwind CSS v4
- **Server:** Node.js, Express 5, ws, node-pty, chokidar
- **Image Generation:** OpenAI API — gpt-image-1 (cheapest), dall-e-2, dall-e-3 (user selects model in UI)
- **Testing:** Vitest (unit), Playwright (e2e)

## Architecture

Three-panel web UI: **Chat**, **Terminal** (xterm.js), **Preview**.

```
Browser (React + xterm.js + Tailwind)
    ↕ WebSocket
Express Server (Node.js)
    ↕ node-pty
tmux session → Claude Code CLI
    ↕
OpenAI API (image generation)
```

Server manages a tmux session via node-pty. WebSocket provides real-time communication between client and server. chokidar watches prototype files for hot-reload in the Preview panel. Users must confirm Claude Code actions through the Terminal panel.

## Running the Project

```bash
# 1. Set your OpenAI API key
export OPENAI_API_KEY=your-key

# 2. Ensure tmux is installed
# macOS: brew install tmux

# 3. Install dependencies
npm install && cd server && npm install && cd ../client && npm install

# 4. Start dev (server on :3001, client on :5173)
npm run dev
```

## Testing

```bash
npm test          # Server unit tests (Vitest)
npm run test:e2e  # End-to-end tests (Playwright)
```

## Conventions

- TypeScript strict mode everywhere
- ESM modules only (no CommonJS)
- Vitest for all tests
- Tailwind CSS v4 for styling
- Server imports shared code via relative paths (`../shared/...`)
- Client imports shared code via `@shared` alias
