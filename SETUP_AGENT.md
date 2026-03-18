# Claude Code Setup Instructions

> Paste this file into Claude Code to automatically set up the project.
> Usage: `Read ~/path/to/SETUP_AGENT.md` then tell Claude "follow these instructions"

---

## Instructions for Claude Code

You are setting up the **Claude Brainstorming Tool** project. Follow each step in order. Stop and report if any step fails.

### Step 1: Check Prerequisites

Run these checks. If any fail, tell the user what to install before continuing.

```bash
node --version    # Need v22+
npm --version     # Need v10+
tmux -V           # Need tmux installed
which claude      # Need Claude Code CLI on PATH
```

**macOS only** — verify Xcode CLI tools (needed for native module compilation):
```bash
xcode-select -p   # Should print a path like /Library/Developer/CommandLineTools
```

If missing, run: `xcode-select --install`

### Step 2: Clone and Install

```bash
git clone https://github.com/hsk-kr/claude-brainstorming-tool.git
cd claude-brainstorming-tool
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

Verify `node-pty` compiled successfully — check for errors during server install. If it failed, the user needs build tools (`xcode-select --install` on macOS, `build-essential` on Linux).

### Step 3: Start the Dev Servers

```bash
npm run dev
```

This starts two processes concurrently:
- Server on `http://localhost:3001`
- Client on `http://localhost:5173`

Wait for both to be ready. You should see:
- `Server running on http://localhost:3001`
- `Local: http://localhost:5173/`

### Step 4: Verify It Works

Open `http://localhost:5173` in the browser. You should see a three-panel layout:
- Chat panel (left)
- Terminal panel (center)
- Preview panel (right)

The terminal panel should show Claude Code starting up inside a tmux session.

### Step 5: Configure OpenAI (Optional)

If the user wants image generation:
1. Click the gear icon in the status bar
2. Enter their OpenAI API key
3. Key stays in localStorage — never sent to the server

### Done

Tell the user the app is running and what URL to open. Mention that:
- The OpenAI API key is optional (only for image generation)
- They can interact with Claude Code through the terminal panel
- Generated prototypes auto-refresh in the preview panel
