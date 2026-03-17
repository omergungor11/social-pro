import { Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { AiGenerateOptions, AiGenerateResult, AiProvider } from "./ai-provider.interface";

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 1024;

/**
 * Claude (Anthropic) AI provider.
 *
 * Uses the @anthropic-ai/sdk to call the Messages API.
 * The API key is read from the ANTHROPIC_API_KEY environment variable.
 * Streaming is not used for the synchronous generate path; a streaming
 * placeholder is included for future extension.
 */
@Injectable()
export class ClaudeProviderService implements AiProvider {
  private readonly logger = new Logger(ClaudeProviderService.name);
  private readonly client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env["ANTHROPIC_API_KEY"],
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
      `Calling Claude model=${CLAUDE_MODEL} maxTokens=${maxTokens}`
    );

    const response = await this.client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    const text = textContent?.type === "text" ? textContent.text : "";
    const tokensUsed =
      (response.usage.input_tokens ?? 0) + (response.usage.output_tokens ?? 0);

    this.logger.debug(
      `Claude response received: tokensUsed=${tokensUsed} stopReason=${response.stop_reason}`
    );

    return { text, tokensUsed, model: CLAUDE_MODEL };
  }

  /**
   * Streaming placeholder — yields text delta chunks via an async generator.
   * Wire this into a Server-Sent Events endpoint in a future iteration.
   */
  async *generateStream(
    prompt: string,
    options: AiGenerateOptions
  ): AsyncGenerator<string> {
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

    const stream = this.client.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: systemParts.join(" "),
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }
}
