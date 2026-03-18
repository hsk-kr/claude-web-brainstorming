import { useRef, useEffect, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import type { WSMessage } from "../types";

interface UseTerminalOptions {
  send: (msg: WSMessage) => void;
  addHandler: (handler: (msg: WSMessage) => void) => () => void;
}

export function useTerminal({ send, addHandler }: UseTerminalOptions) {
  const termRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!termRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      theme: {
        background: "#1a1b26",
        foreground: "#a9b1d6",
        cursor: "#c0caf5",
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(termRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.onData((data) => {
      send({ type: "terminal.input", payload: data });
    });

    terminal.onResize(({ cols, rows }) => {
      send({ type: "terminal.resize", payload: { cols, rows } });
    });

    const removeHandler = addHandler((msg) => {
      if (msg.type === "terminal.output") {
        terminal.write(msg.payload);
      }
    });

    const onResize = () => fitAddon.fit();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      removeHandler();
      terminal.dispose();
    };
  }, [send, addHandler]);

  const fit = useCallback(() => {
    fitAddonRef.current?.fit();
  }, []);

  return { termRef, fit };
}
