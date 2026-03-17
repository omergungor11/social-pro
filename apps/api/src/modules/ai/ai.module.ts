import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { ClaudeProviderService } from "./services/claude-provider.service";
import { OpenAiProviderService } from "./services/openai-provider.service";
import { ContentTemplateService } from "./content-template.service";

/**
 * AI Content Generation module.
 *
 * Provides:
 *  - AiService: orchestrates provider calls, saves AiGeneration records, exposes usage stats
 *  - ContentTemplateService: CRUD for ContentTemplate with seeded system templates
 *  - ClaudeProviderService: primary Anthropic Claude provider
 *  - OpenAiProviderService: fallback OpenAI GPT-4o provider
 *
 * Environment variables required:
 *  - ANTHROPIC_API_KEY — Anthropic API key
 *  - OPENAI_API_KEY    — OpenAI API key
 */
@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [
    AiService,
    ContentTemplateService,
    ClaudeProviderService,
    OpenAiProviderService,
  ],
  exports: [AiService, ContentTemplateService],
})
export class AiModule {}
