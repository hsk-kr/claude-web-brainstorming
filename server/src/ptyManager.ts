import * as pty from "node-pty";

type DataCallback = (data: string) => void;
type ExitCallback = (code: number, signal: number | undefined) => void;

export class PtyManager {
  private ptyProcess: pty.IPty | null = null;
  private dataCallbacks: DataCallback[] = [];
  private exitCallbacks: ExitCallback[] = [];
  private nativeDisposables: pty.IDisposable[] = [];

  constructor(private sessionName: string) {
    this.spawn();
  }

  private spawn(): void {
    try {
      // Use shell to resolve tmux path from user's PATH
      this.ptyProcess = pty.spawn("/bin/zsh", ["-lc", `tmux attach -t ${this.sessionName}`], {
        name: "xterm-256color",
        cols: 120,
        rows: 40,
        cwd: process.cwd(),
        env: process.env as Record<string, string>,
      });
    } catch (err) {
      this.ptyProcess = null;
      throw new Error(
        `Failed to attach to tmux session "${this.sessionName}": ${err instanceof Error ? err.message : err}`
      );
    }

    this.nativeDisposables.push(
      this.ptyProcess.onData((data) => {
        this.dataCallbacks.forEach((cb) => {
          try { cb(data); } catch (e) { console.error("PtyManager data callback error:", e); }
        });
      })
    );

    this.nativeDisposables.push(
      this.ptyProcess.onExit(({ exitCode, signal }) => {
        this.exitCallbacks.forEach((cb) => {
          try { cb(exitCode, signal); } catch (e) { console.error("PtyManager exit callback error:", e); }
        });
        this.ptyProcess = null;
      })
    );
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
    this.nativeDisposables.forEach((d) => d.dispose());
    this.nativeDisposables = [];
    this.ptyProcess?.kill();
    this.ptyProcess = null;
    this.dataCallbacks = [];
    this.exitCallbacks = [];
  }
}
