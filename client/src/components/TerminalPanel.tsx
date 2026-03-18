import { useEffect } from "react";
import { useTerminal } from "../hooks/useTerminal";
import { ConvenienceButtons } from "./ConvenienceButtons";
import type { WSMessage } from "../types";
import "@xterm/xterm/css/xterm.css";

interface TerminalPanelProps {
  send: (msg: WSMessage) => void;
  addHandler: (handler: (msg: WSMessage) => void) => () => void;
}

export function TerminalPanel({ send, addHandler }: TerminalPanelProps) {
  const { termRef, fit } = useTerminal({ send, addHandler });

  useEffect(() => {
    const observer = new ResizeObserver(() => fit());
    if (termRef.current) {
      observer.observe(termRef.current);
    }
    return () => observer.disconnect();
  }, [fit, termRef]);

  return (
    <div className="flex flex-col h-full bg-[#1a1b26]">
      <div className="flex-1 min-h-0" ref={termRef} />
      <ConvenienceButtons send={send} />
    </div>
  );
}
