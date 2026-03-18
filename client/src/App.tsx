import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { usePreview } from "./hooks/usePreview";
import { ChatPanel } from "./components/ChatPanel";
import { TerminalPanel } from "./components/TerminalPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { SettingsPanel, useSettings } from "./components/SettingsPanel";

const WS_URL = `ws://${window.location.host}/ws`;

export default function App() {
  const { send, addHandler, connected } = useWebSocket(WS_URL);
  const { prototypeUrl, images, refreshKey, refreshPreview } = usePreview({ addHandler });
  const { settings, updateSettings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Status bar */}
      <div className="h-8 flex items-center px-4 bg-gray-900 border-b border-gray-800 text-xs">
        <span className="font-semibold text-gray-300">Claude Brainstorm</span>
        <span className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Settings
          </button>
          <button
            onClick={() => {
              if (confirm("End the Claude Code session?")) {
                send({ type: "session.end", payload: null });
              }
            }}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            End Session
          </button>
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-gray-400">
              {connected ? "Connected" : "Disconnected"}
            </span>
          </span>
        </span>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex min-h-0">
        <div className="w-80 flex-shrink-0 border-r border-gray-800">
          <ChatPanel send={send} apiKey={settings.openaiApiKey} />
        </div>
        <div className="flex-1 min-w-0">
          <TerminalPanel send={send} addHandler={addHandler} />
        </div>
        <div className="w-96 flex-shrink-0 border-l border-gray-800">
          <PreviewPanel
            prototypeUrl={prototypeUrl}
            images={images}
            refreshKey={refreshKey}
            onRefresh={refreshPreview}
          />
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
