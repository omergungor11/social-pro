import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ImageGenerateOptions, ImageGenerateResult } from "./image-provider.interface";

const GEMINI_IMAGE_MODEL = "gemini-2.0-flash-exp";
const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

// ---------------------------------------------------------------------------
// Raw API response shapes — used only internally for parsing
// ---------------------------------------------------------------------------

interface GeminiInlineData {
  mimeType: string;
  data: string;
}

interface GeminiPart {
  text?: string;
  inlineData?: GeminiInlineData;
}

interface GeminiContent {
  parts: GeminiPart[];
}

interface GeminiCandidate {
  content: GeminiContent;
}

interface GeminiResponse {
  candidates: GeminiCandidate[];
}

/**
 * Google Gemini image generation provider.
 *
 * Calls the Gemini generateContent REST endpoint with
 * `responseModalities: ["TEXT", "IMAGE"]` to produce inline base64 images.
 *
 * Environment variable required:
 *   GOOGLE_AI_API_KEY — Google AI Studio API key
 */
@Injectable()
export class GeminiImageProviderService {
  private readonly logger = new Logger(GeminiImageProviderService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor() {
    this.apiKey = process.env["GOOGLE_AI_API_KEY"] ?? "";
    this.apiUrl = `${GEMINI_API_BASE}/${GEMINI_IMAGE_MODEL}:generateContent`;
  }

  async generateImage(
    prompt: string,
    options: ImageGenerateOptions
  ): Promise<ImageGenerateResult> {
    const enrichedPrompt = this.buildPrompt(prompt, options);

    this.logger.debug(
      `Calling Gemini image model=${GEMINI_IMAGE_MODEL} promptLength=${enrichedPrompt.length}`
    );

    const requestBody = {
      contents: [
        {
          parts: [{ text: `Generate an image: ${enrichedPrompt}` }],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    };

    let responseBody: GeminiResponse;

    try {
      const response = await fetch(
        `${this.apiUrl}?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Gemini API error: status=${response.status} body=${errorText}`
        );
        throw new Error(
          `Gemini API returned ${response.status}: ${errorText}`
        );
      }

      responseBody = (await response.json()) as GeminiResponse;
    } catch (err) {
      this.logger.error(`Gemini HTTP request failed: ${String(err)}`);
      throw new InternalServerErrorException(
        "Gemini image generation request failed. Please try again later."
      );
    }

    const inlineData = this.extractInlineData(responseBody);

    if (!inlineData) {
      this.logger.error(
        "Gemini response contained no inlineData image part"
      );
      throw new InternalServerErrorException(
        "Gemini did not return an image. The prompt may have been blocked by safety filters."
      );
    }

    this.logger.log(
      `Gemini image generated: mimeType=${inlineData.mimeType} model=${GEMINI_IMAGE_MODEL}`
    );

    return {
      imageBase64: inlineData.data,
      mimeType: inlineData.mimeType,
      prompt: enrichedPrompt,
      model: GEMINI_IMAGE_MODEL,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildPrompt(
    basePrompt: string,
    options: ImageGenerateOptions
  ): string {
    const parts: string[] = [basePrompt];

    if (options.style) {
      parts.push(`Style: ${options.style}.`);
    }

    if (options.platform) {
      parts.push(
        `Optimise the composition for ${options.platform} social media.`
      );
    }

    if (options.aspectRatio) {
      const ratioDescriptions: Record<string, string> = {
        "1:1": "square (1:1 aspect ratio)",
        "16:9": "landscape widescreen (16:9 aspect ratio)",
        "9:16": "portrait vertical (9:16 aspect ratio)",
        "4:3": "standard landscape (4:3 aspect ratio)",
      };
      const description = ratioDescriptions[options.aspectRatio];
      if (description) {
        parts.push(`Compose the image as ${description}.`);
      }
    }

    return parts.join(" ");
  }

  private extractInlineData(
    response: GeminiResponse
  ): GeminiInlineData | null {
    const candidates = response.candidates ?? [];

    for (const candidate of candidates) {
      const parts = candidate.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data && part.inlineData.mimeType) {
          return part.inlineData;
        }
      }
    }

    return null;
  }
}
