import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AiGeneration, AiGenerationStatus, AiModel } from "@social-pro/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { PaginatedResponseDto, PaginationQueryDto } from "../common/dto/pagination.dto";
import { ClaudeProviderService } from "./services/claude-provider.service";
import { OpenAiProviderService } from "./services/openai-provider.service";
import { GeminiImageProviderService } from "./services/gemini-image-provider.service";
import { ContentTemplateService } from "./content-template.service";
import { GenerateContentDto } from "./dto/generate-content.dto";
import { GenerateImageDto } from "./dto/generate-image.dto";
import { AiGenerateOptions } from "./services/ai-provider.interface";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface GenerateResult {
  generation: AiGeneration;
  text: string;
}

export interface GenerateImageResult {
  generation: AiGeneration;
  imageBase64: string;
  mimeType: string;
}

export interface UsageStats {
  agencyId: string;
  periodStart: Date;
  periodEnd: Date;
  generationsUsed: number;
  generationsLimit: number | null;
  tokensUsed: number;
}

// ---------------------------------------------------------------------------
// Approximate cost constants (USD cents per 1 000 tokens)
// ---------------------------------------------------------------------------

const CLAUDE_COST_PER_1K_TOKENS_CENTS = 3;
const OPENAI_COST_PER_1K_TOKENS_CENTS = 2;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly claude: ClaudeProviderService,
    private readonly openai: OpenAiProviderService,
    private readonly geminiImage: GeminiImageProviderService,
    private readonly templateService: ContentTemplateService
  ) {}

  // ---------------------------------------------------------------------------
  // Generate
  // ---------------------------------------------------------------------------

  async generate(
    agencyId: string,
    userId: string,
    dto: GenerateContentDto
  ): Promise<GenerateResult> {
    let effectivePrompt = dto.prompt;

    // Append template context when a templateId is supplied
    if (dto.templateId) {
      const template = await this.templateService.findOne(dto.templateId);
      if (!template) {
        throw new NotFoundException(
          `ContentTemplate '${dto.templateId}' not found`
        );
      }
      effectivePrompt = `Use the following template as a guide:\n${JSON.stringify(template.template)}\n\n${dto.prompt}`;
    }

    const options: AiGenerateOptions = {
      platform: dto.platform,
      tone: dto.tone,
      language: dto.language,
    };

    // Create a PENDING record immediately so we have an id to update
    const record = await this.prisma.aiGeneration.create({
      data: {
        agencyId,
        userId,
        prompt: effectivePrompt,
        model: AiModel.CLAUDE,
        status: AiGenerationStatus.PENDING,
      },
    });

    try {
      // Primary: Claude
      const result = await this.callWithFallback(effectivePrompt, options);

      const costCents = Math.ceil(
        (result.tokensUsed / 1000) *
          (result.usedModel === "claude"
            ? CLAUDE_COST_PER_1K_TOKENS_CENTS
            : OPENAI_COST_PER_1K_TOKENS_CENTS)
      );

      const updated = await this.prisma.aiGeneration.update({
        where: { id: record.id },
        data: {
          model: result.usedModel === "claude" ? AiModel.CLAUDE : AiModel.OPENAI,
          tokensUsed: result.tokensUsed,
          costCents,
          result: { text: result.text },
          status: AiGenerationStatus.COMPLETED,
        },
      });

      this.logger.log(
        `AI generation completed: id=${record.id} agencyId=${agencyId} model=${updated.model} tokens=${result.tokensUsed}`
      );

      return { generation: updated, text: result.text };
    } catch (err) {
      await this.prisma.aiGeneration.update({
        where: { id: record.id },
        data: { status: AiGenerationStatus.FAILED },
      });

      this.logger.error(
        `AI generation failed: id=${record.id} agencyId=${agencyId} error=${String(err)}`
      );

      throw new InternalServerErrorException(
        "AI generation failed. Please try again later."
      );
    }
  }

  // ---------------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------------

  async getHistory(
    agencyId: string,
    pagination: PaginationQueryDto
  ): Promise<PaginatedResponseDto<AiGeneration>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [generations, total] = await this.prisma.$transaction([
      this.prisma.aiGeneration.findMany({
        where: { agencyId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.aiGeneration.count({ where: { agencyId } }),
    ]);

    return PaginatedResponseDto.of(generations, total, page, limit);
  }

  // ---------------------------------------------------------------------------
  // Usage
  // ---------------------------------------------------------------------------

  async getUsage(agencyId: string): Promise<UsageStats> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [countResult, tokenResult] = await this.prisma.$transaction([
      this.prisma.aiGeneration.count({
        where: {
          agencyId,
          status: AiGenerationStatus.COMPLETED,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.aiGeneration.aggregate({
        where: {
          agencyId,
          status: AiGenerationStatus.COMPLETED,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        _sum: { tokensUsed: true },
      }),
    ]);

    // Fetch the plan limit if the agency has a plan
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      include: { plan: true },
    });

    const generationsLimit = agency?.plan?.aiCreditsPerMonth ?? null;

    return {
      agencyId,
      periodStart,
      periodEnd,
      generationsUsed: countResult,
      generationsLimit,
      tokensUsed: tokenResult._sum.tokensUsed ?? 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Generate image
  // ---------------------------------------------------------------------------

  async generateImage(
    agencyId: string,
    userId: string,
    dto: GenerateImageDto
  ): Promise<GenerateImageResult> {
    // Create a PENDING record so the generation is tracked before the API call
    const record = await this.prisma.aiGeneration.create({
      data: {
        agencyId,
        userId,
        prompt: dto.prompt,
        model: AiModel.GEMINI,
        status: AiGenerationStatus.PENDING,
      },
    });

    try {
      const result = await this.geminiImage.generateImage(dto.prompt, {
        aspectRatio: dto.aspectRatio,
        style: dto.style,
        platform: dto.platform,
      });

      // Store metadata only — base64 payload is not persisted to avoid bloating the DB
      const updated = await this.prisma.aiGeneration.update({
        where: { id: record.id },
        data: {
          model: AiModel.GEMINI,
          tokensUsed: 0,
          costCents: 0,
          result: {
            mimeType: result.mimeType,
            model: result.model,
            promptUsed: result.prompt,
          },
          status: AiGenerationStatus.COMPLETED,
        },
      });

      this.logger.log(
        `Gemini image generation completed: id=${record.id} agencyId=${agencyId} mimeType=${result.mimeType}`
      );

      return {
        generation: updated,
        imageBase64: result.imageBase64,
        mimeType: result.mimeType,
      };
    } catch (err) {
      await this.prisma.aiGeneration.update({
        where: { id: record.id },
        data: { status: AiGenerationStatus.FAILED },
      });

      this.logger.error(
        `Gemini image generation failed: id=${record.id} agencyId=${agencyId} error=${String(err)}`
      );

      throw new InternalServerErrorException(
        "Image generation failed. Please try again later."
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async callWithFallback(
    prompt: string,
    options: AiGenerateOptions
  ): Promise<{ text: string; tokensUsed: number; usedModel: "claude" | "openai" }> {
    try {
      const result = await this.claude.generate(prompt, options);
      return { ...result, usedModel: "claude" };
    } catch (claudeErr) {
      this.logger.warn(
        `Claude provider failed, falling back to OpenAI: ${String(claudeErr)}`
      );

      const result = await this.openai.generate(prompt, options);
      return { ...result, usedModel: "openai" };
    }
  }
}
