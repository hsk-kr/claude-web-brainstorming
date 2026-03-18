import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const AVAILABLE_MODELS = [
  { id: "gpt-image-1", name: "GPT Image 1", description: "Cheapest, fast" },
  { id: "dall-e-2", name: "DALL-E 2", description: "Fast, low cost" },
  { id: "dall-e-3", name: "DALL-E 3", description: "Higher quality" },
] as const;

export type ImageModel = (typeof AVAILABLE_MODELS)[number]["id"];

export class ImageGenerator {
  constructor(private outputDir: string = "./generated-images") {}

  async generate(
    prompt: string,
    apiKey: string,
    model: ImageModel = "gpt-image-1"
  ): Promise<{ url: string; path: string }> {
    if (!prompt.trim()) {
      throw new Error("Prompt cannot be empty");
    }

    if (!apiKey.trim()) {
      throw new Error("OpenAI API key is required. Set it in Settings.");
    }

    const client = new OpenAI({ apiKey });

    await fs.mkdir(this.outputDir, { recursive: true });

    const response = await client.images.generate({
      model,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const imageUrl = response.data[0]?.url || response.data[0]?.b64_json;
    if (!imageUrl) {
      throw new Error("No image data in response");
    }

    const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.png`;
    const filePath = path.join(this.outputDir, filename);

    if (response.data[0]?.b64_json) {
      await fs.writeFile(filePath, Buffer.from(response.data[0].b64_json, "base64"));
    } else if (response.data[0]?.url) {
      const res = await fetch(response.data[0].url);
      const buffer = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(filePath, buffer);
    }

    return {
      url: `/generated-images/${filename}`,
      path: filePath,
    };
  }
}
