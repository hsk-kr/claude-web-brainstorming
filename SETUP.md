# Setup Guide

## Prerequisites

| Requirement | Version | Install |
|-------------|---------|---------|
| Node.js | v22+ | [nodejs.org](https://nodejs.org) |
| npm | v10+ | Comes with Node.js |
| tmux | any | `brew install tmux` (macOS) / `apt install tmux` (Linux) |
| Claude Code CLI | latest | `npm install -g @anthropic-ai/claude-code` |
| Xcode CLI Tools | any | `xcode-select --install` (macOS only, needed for node-pty) |

> **node-pty** is a native module that compiles during `npm install`. On macOS you need Xcode Command Line Tools. On Linux you need `build-essential` / `python3` / `make`.

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/hsk-kr/claude-brainstorming-tool.git
cd claude-brainstorming-tool

# 2. Install all dependencies (root + server + client)
npm install && cd server && npm install && cd ../client && npm install && cd ..

# 3. Start dev servers
npm run dev
```

This launches:
- **Server** on `http://localhost:3001` (Express + WebSocket)
- **Client** on `http://localhost:5173` (Vite dev server)

The server automatically creates a tmux session (`claude-brainstorm`) and launches Claude Code CLI inside it.

## Set Your OpenAI API Key

1. Open `http://localhost:5173` in your browser
2. Click the **gear icon** in the status bar
3. Paste your OpenAI API key
4. Key is stored in your browser's localStorage — it never touches the server

This is only needed for image generation features. The rest of the app works without it.

## Architecture

```
Browser (React + xterm.js + Tailwind)
    ↕ WebSocket (:5173 → proxied to :3001)
Express Server (Node.js)
    ↕ node-pty
tmux session → Claude Code CLI
    ↕
OpenAI API (image generation)
```

Three-panel UI:
- **Chat** — Send brainstorming prompts to Claude
- **Terminal** — See Claude Code running live, confirm actions
- **Preview** — Auto-refreshing preview of generated prototypes

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start both server and client in dev mode |
| `npm run dev:server` | Start only the server (port 3001) |
| `npm run dev:client` | Start only the client (port 5173) |
| `npm run build` | Build the client for production |
| `npm test` | Run server unit tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |

## Troubleshooting

### `node-pty` install fails
```bash
# macOS
xcode-select --install

# Linux (Debian/Ubuntu)
sudo apt install build-essential python3 make
```

### `tmux: command not found`
```bash
# macOS
brew install tmux

# Linux (Debian/Ubuntu)
sudo apt install tmux
```

### Server can't find `claude` command
Make sure Claude Code CLI is installed globally and on your PATH:
```bash
npm install -g @anthropic-ai/claude-code
which claude  # should print a path
```

### Port already in use
```bash
# Kill whatever's on port 3001
lsof -ti:3001 | xargs kill -9

# Or change the port
PORT=3002 npm run dev:server
```
