import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export class GeminiImageGenerator {
  private client: GoogleGenAI;

  constructor(
    apiKey: string,
    private outputDir: string = "./generated-images"
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate(prompt: string): Promise<{ url: string; path: string }> {
    if (!prompt.trim()) {
      throw new Error("Prompt cannot be empty");
    }

    await fs.mkdir(this.outputDir, { recursive: true });

    const response = await this.client.models.generateImages({
      model: "imagen-3.0-generate-001",
      prompt,
      config: { numberOfImages: 1 },
    });

    const imageData = response.generatedImages?.[0]?.image?.imageBytes;
    if (!imageData) {
      throw new Error("No image data in response");
    }

    const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.png`;
    const filePath = path.join(this.outputDir, filename);
    await fs.writeFile(filePath, Buffer.from(imageData, "base64"));

    return {
      url: `/generated-images/${filename}`,
      path: filePath,
    };
  }
}
