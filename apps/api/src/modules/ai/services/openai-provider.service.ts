import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";
import { AiGenerateOptions, AiGenerateResult, AiProvider } from "./ai-provider.interface";

const OPENAI_MODEL = "gpt-4o";
const DEFAULT_MAX_TOKENS = 1024;

/**
 * OpenAI GPT-4o provider.
 *
 * Used as the fallback when the primary Claude provider fails.
 * The API key is read from the OPENAI_API_KEY environment variable.
 */
@Injectable()
export class OpenAiProviderService implements AiProvider {
  private readonly logger = new Logger(OpenAiProviderService.name);
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env["OPENAI_API_KEY"],
    });
  }

  async generate(
    prompt: string,
    options: AiGenerateOptions
  ): Promise<AiGenerateResult> {
    const systemParts: string[] = [
      "You are a professional social media content writer.",
    ];

    if (options.platform) {
      systemParts.push(`You are writing content for ${options.platform}.`);
    }
    if (options.tone) {
      systemParts.push(`The tone should be ${options.tone}.`);
    }
    if (options.language) {
      systemParts.push(`Write exclusively in ${options.language}.`);
    }

    const systemPrompt = systemParts.join(" ");
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

    this.logger.debug(
      `Calling OpenAI model=${OPENAI_MODEL} maxTokens=${maxTokens}`
    );

    const response = await this.client.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    const tokensUsed = response.usage?.total_tokens ?? 0;

    this.logger.debug(
      `OpenAI response received: tokensUsed=${tokensUsed} finishReason=${response.choices[0]?.finish_reason}`
    );

    return { text, tokensUsed, model: OPENAI_MODEL };
  }
}
