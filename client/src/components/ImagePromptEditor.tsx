import { useState } from "react";

const IMAGE_MODELS = [
  { id: "gpt-image-1", name: "GPT Image 1 (cheapest)" },
  { id: "dall-e-2", name: "DALL-E 2" },
  { id: "dall-e-3", name: "DALL-E 3 (highest quality)" },
];

interface ImagePromptEditorProps {
  initialPrompt: string;
  onSubmit: (prompt: string, model: string) => void;
  onCancel: () => void;
}

export function ImagePromptEditor({ initialPrompt, onSubmit, onCancel }: ImagePromptEditorProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [model, setModel] = useState("gpt-image-1");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4">
        <h3 className="text-lg font-semibold text-white mb-3">Generate Image</h3>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full h-32 bg-gray-900 text-white rounded p-3 text-sm resize-none border border-gray-600 focus:border-blue-500 focus:outline-none"
          placeholder="Describe the image you want to generate..."
          autoFocus
        />
        <div className="mt-3">
          <label className="text-sm text-gray-400 block mb-1">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-gray-900 text-white rounded p-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            {IMAGE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(prompt, model)}
            disabled={!prompt.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
