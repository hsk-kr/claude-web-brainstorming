import { describe, it, expect, vi } from "vitest";
import { GeminiImageGenerator } from "../geminiApi.js";

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateImages: vi.fn().mockResolvedValue({
        generatedImages: [
          {
            image: {
              imageBytes: Buffer.from("fake-image-data").toString("base64"),
            },
          },
        ],
      }),
    },
  })),
}));

describe("GeminiImageGenerator", () => {
  it("generates an image and saves to disk", async () => {
    const generator = new GeminiImageGenerator("fake-api-key", "/tmp/test-images");
    const result = await generator.generate("a cat wearing a hat");

    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("path");
    expect(result.path).toContain("/tmp/test-images/");
    expect(result.path).toMatch(/\.png$/);
  });

  it("throws on empty prompt", async () => {
    const generator = new GeminiImageGenerator("fake-api-key", "/tmp/test-images");
    await expect(generator.generate("")).rejects.toThrow("Prompt cannot be empty");
  });
});
