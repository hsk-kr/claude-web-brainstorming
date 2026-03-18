# Claude Brainstorming Tool

## Project Vision

A web-based brainstorming and prototyping tool that wraps Claude Code CLI behind a friendly UI. Non-technical users can brainstorm ideas, generate images (via Gemini), and create prototypes — all powered by Claude Code running in the background.

## Status: Brainstorming Phase (2026-03-18)

Currently in the design/brainstorming phase. No code written yet.

## Core Concept

- **Web UI** → users interact through a browser-based interface
- **Web Server** → manages Claude Code CLI sessions via tmux
- **WebSocket** → real-time communication between client and server
- **Claude Code CLI** → runs in tmux sessions, user confirms actions manually
- **Image Generation** → uses Gemini for creating visuals from brainstormed ideas
- **Prototyping** → generates working prototypes from ideas

## Architecture (Proposed)

```
Browser (Web Client)
    ↕ WebSocket
Web Server (Node/Python)
    ↕ tmux sessions
Claude Code CLI instances
```

Key constraint: Claude Code requires manual confirmation from the user for certain actions. The UI must surface these confirmation prompts and let users approve/deny them.

## Design Decisions Log

- (pending) Architecture approach — brainstorming in progress
- (pending) Tech stack selection
- (pending) How to bridge tmux ↔ web server communication
- (pending) Image generation integration (Gemini)

## Conventions

- (to be determined during design phase)

## Running the Project

- (not yet applicable — no code written)
