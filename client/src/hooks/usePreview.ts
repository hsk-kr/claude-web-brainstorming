import { useState, useEffect, useCallback } from "react";
import type { WSMessage } from "../types";

interface PreviewState {
  prototypeUrl: string | null;
  images: Array<{ url: string; path: string }>;
  refreshKey: number;
}

interface UsePreviewOptions {
  addHandler: (handler: (msg: WSMessage) => void) => () => void;
}

export function usePreview({ addHandler }: UsePreviewOptions) {
  const [state, setState] = useState<PreviewState>({
    prototypeUrl: null,
    images: [],
    refreshKey: 0,
  });

  useEffect(() => {
    const removeHandler = addHandler((msg) => {
      if (msg.type === "file.changed") {
        const filePath = msg.payload.path;
        if (filePath.includes("prototypes/") && filePath.endsWith(".html")) {
          const relative = filePath.substring(filePath.indexOf("prototypes/"));
          setState((prev) => ({
            ...prev,
            prototypeUrl: `/${relative}`,
            refreshKey: prev.refreshKey + 1,
          }));
        }
      }

      if (msg.type === "image.ready") {
        setState((prev) => ({
          ...prev,
          images: [...prev.images, msg.payload],
        }));
      }
    });

    return removeHandler;
  }, [addHandler]);

  const refreshPreview = useCallback(() => {
    setState((prev) => ({ ...prev, refreshKey: prev.refreshKey + 1 }));
  }, []);

  return { ...state, refreshPreview };
}
