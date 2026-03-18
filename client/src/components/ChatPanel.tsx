import { useState, useRef, useEffect } from "react";
import { ImagePromptEditor } from "./ImagePromptEditor";
import type { WSMessage } from "../types";

interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  pinned: boolean;
}

interface ChatPanelProps {
  send: (msg: WSMessage) => void;
  apiKey: string;
}

export function ChatPanel({ send, apiKey }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [imageEditor, setImageEditor] = useState<{ prompt: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      text,
      timestamp: new Date(),
      pinned: false,
    };

    setMessages((prev) => [...prev, msg]);
    setInput("");

    send({ type: "terminal.input", payload: text + "\r" });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const togglePin = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m))
    );
  };

  const createPrototype = (text: string) => {
    const slug = text.split(/\s+/).slice(0, 3).join("-").toLowerCase().replace(/[^a-z0-9-]/g, "");
    const name = slug || `prototype-${Date.now()}`;
    const prompt = `Create an HTML/CSS/JS prototype for the following idea. Save it to prototypes/${name}/index.html:\n\n${text}`;
    send({ type: "terminal.input", payload: prompt + "\r" });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Brainstorm
        </h2>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg ${msg.pinned ? "bg-yellow-900/30 border border-yellow-700/50" : "bg-gray-800"}`}
          >
            <p className="text-sm text-gray-200 whitespace-pre-wrap">{msg.text}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">
                {msg.timestamp.toLocaleTimeString()}
              </span>
              <button
                onClick={() => togglePin(msg.id)}
                className="text-xs text-gray-500 hover:text-yellow-400 transition-colors"
              >
                {msg.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => setImageEditor({ prompt: msg.text })}
                className="text-xs text-gray-500 hover:text-blue-400 transition-colors"
              >
                Generate Image
              </button>
              <button
                onClick={() => createPrototype(msg.text)}
                className="text-xs text-gray-500 hover:text-green-400 transition-colors"
              >
                Create Prototype
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="flex-1 bg-gray-800 text-white rounded-lg p-3 text-sm resize-none border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="Type your idea... (Enter to send)"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="self-end px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {imageEditor && (
        <ImagePromptEditor
          initialPrompt={imageEditor.prompt}
          onSubmit={(prompt, model) => {
            send({ type: "image.request", payload: { prompt, model, apiKey } });
            setImageEditor(null);
          }}
          onCancel={() => setImageEditor(null)}
        />
      )}
    </div>
  );
}
