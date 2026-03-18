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
