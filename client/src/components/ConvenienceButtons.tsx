import type { WSMessage } from "../types";

interface ConvenienceButtonsProps {
  send: (msg: WSMessage) => void;
}

export function ConvenienceButtons({ send }: ConvenienceButtonsProps) {
  const sendInput = (text: string) => {
    send({ type: "terminal.input", payload: text });
  };

  return (
    <div className="flex gap-2 p-2 bg-gray-900/80 backdrop-blur border-t border-gray-700">
      <button
        onClick={() => sendInput("y\r")}
        className="px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
      >
        Accept (y)
      </button>
      <button
        onClick={() => sendInput("n\r")}
        className="px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
      >
        Reject (n)
      </button>
      <div className="w-px bg-gray-600 mx-1" />
      {[1, 2, 3, 4].map((n) => (
        <button
          key={n}
          onClick={() => sendInput(`${n}\r`)}
          className="px-3 py-1.5 text-sm font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
        >
          {n}
        </button>
      ))}
      <div className="w-px bg-gray-600 mx-1" />
      <button
        onClick={() => sendInput("\x03")}
        className="px-3 py-1.5 text-sm font-medium bg-yellow-600 hover:bg-yellow-500 text-white rounded transition-colors"
      >
        Cancel (^C)
      </button>
    </div>
  );
}
