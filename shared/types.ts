export type WSMessage =
  | { type: "terminal.input"; payload: string }
  | { type: "terminal.output"; payload: string }
  | { type: "terminal.resize"; payload: { cols: number; rows: number } }
  | { type: "image.request"; payload: { prompt: string; model?: string } }
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
