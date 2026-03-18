interface PreviewPanelProps {
  prototypeUrl: string | null;
  images: Array<{ url: string; path: string }>;
  refreshKey: number;
  onRefresh: () => void;
}

export function PreviewPanel({ prototypeUrl, images, refreshKey, onRefresh }: PreviewPanelProps) {
  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Preview
        </h2>
        <button
          onClick={onRefresh}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {prototypeUrl && (
        <div className="flex-1 min-h-0 border-b border-gray-700">
          <iframe
            key={refreshKey}
            src={prototypeUrl}
            className="w-full h-full bg-white"
            sandbox="allow-scripts allow-same-origin"
            title="Prototype Preview"
          />
        </div>
      )}

      {images.length > 0 && (
        <div className={`${prototypeUrl ? "h-48" : "flex-1"} overflow-y-auto p-3`}>
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
            Generated Images
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {images.map((img, i) => (
              <img
                key={i}
                src={img.url}
                alt={`Generated ${i + 1}`}
                className="w-full rounded border border-gray-700"
              />
            ))}
          </div>
        </div>
      )}

      {!prototypeUrl && images.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
          Prototypes and images will appear here
        </div>
      )}
    </div>
  );
}
