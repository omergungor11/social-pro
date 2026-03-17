export interface AiGenerateOptions {
  platform?: string;
  tone?: string;
  language?: string;
  maxTokens?: number;
}

export interface AiGenerateResult {
  text: string;
  tokensUsed: number;
  model: string;
}

export interface AiProvider {
  generate(prompt: string, options: AiGenerateOptions): Promise<AiGenerateResult>;
}

export const AI_PROVIDER = Symbol("AI_PROVIDER");
