import { exec } from "child_process";
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
