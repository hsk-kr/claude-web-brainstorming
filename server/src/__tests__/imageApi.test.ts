import { describe, it, expect, vi } from "vitest";
import { ImageGenerator, AVAILABLE_MODELS } from "../imageApi.js";

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    images: {
      generate: vi.fn().mockResolvedValue({
        data: [
          {
            url: "https://example.com/fake-image.png",
          },
        ],
      }),
    },
  })),
}));

// Mock fetch for downloading the image URL
global.fetch = vi.fn().mockResolvedValue({
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
}) as any;

describe("ImageGenerator", () => {
  it("generates an image and saves to disk", async () => {
    const generator = new ImageGenerator("fake-api-key", "/tmp/test-images");
    const result = await generator.generate("a cat wearing a hat");

    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("path");
    expect(result.path).toContain("/tmp/test-images/");
    expect(result.path).toMatch(/\.png$/);
  });

  it("throws on empty prompt", async () => {
    const generator = new ImageGenerator("fake-api-key", "/tmp/test-images");
    await expect(generator.generate("")).rejects.toThrow("Prompt cannot be empty");
  });

  it("accepts a model parameter", async () => {
    const generator = new ImageGenerator("fake-api-key", "/tmp/test-images");
    const result = await generator.generate("a dog", "dall-e-3");
    expect(result).toHaveProperty("url");
  });

  it("exports available models", () => {
    expect(AVAILABLE_MODELS.length).toBeGreaterThan(0);
    expect(AVAILABLE_MODELS[0]).toHaveProperty("id");
    expect(AVAILABLE_MODELS[0]).toHaveProperty("name");
  });
});
