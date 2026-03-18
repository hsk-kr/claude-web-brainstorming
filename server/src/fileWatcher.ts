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
