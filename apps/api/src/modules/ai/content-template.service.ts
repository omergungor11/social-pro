import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { ContentTemplate, SocialPlatform } from "@social-pro/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";

// ---------------------------------------------------------------------------
// System template seed data
// ---------------------------------------------------------------------------

interface SystemTemplateSeed {
  name: string;
  platform: SocialPlatform | null;
  template: Record<string, unknown>;
  variables: string[];
}

const SYSTEM_TEMPLATES: SystemTemplateSeed[] = [
  {
    name: "Product Launch",
    platform: null,
    template: {
      body: "Exciting news! Introducing {{productName}} — {{tagline}}. {{description}} Available now: {{url}} #NewProduct #{{brandHashtag}}",
    },
    variables: ["productName", "tagline", "description", "url", "brandHashtag"],
  },
  {
    name: "Event Promo",
    platform: null,
    template: {
      body: "Join us for {{eventName}} on {{date}} at {{location}}! {{description}} Register here: {{registrationUrl}} #Event #{{cityHashtag}}",
    },
    variables: ["eventName", "date", "location", "description", "registrationUrl", "cityHashtag"],
  },
  {
    name: "Blog Share",
    platform: null,
    template: {
      body: "New blog post: {{title}} — {{summary}} Read the full article: {{url}} #Blog #{{topicHashtag}}",
    },
    variables: ["title", "summary", "url", "topicHashtag"],
  },
  {
    name: "Quote",
    platform: null,
    template: {
      body: '"{{quote}}" — {{author}} #{{topic}} #Inspiration',
    },
    variables: ["quote", "author", "topic"],
  },
  {
    name: "Poll",
    platform: SocialPlatform.TWITTER,
    template: {
      body: "Quick poll: {{question}} Option A: {{optionA}} | Option B: {{optionB}} | Option C: {{optionC}} Vote below!",
    },
    variables: ["question", "optionA", "optionB", "optionC"],
  },
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ContentTemplateService implements OnModuleInit {
  private readonly logger = new Logger(ContentTemplateService.name);

  // Sentinel agency ID used for system-owned templates stored once per
  // installation. We use a well-known placeholder value that will never
  // collide with a real cuid().
  private static readonly SYSTEM_AGENCY_ID = "system";

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onModuleInit(): Promise<void> {
    try {
      await this.seedSystemTemplates();
    } catch (error) {
      this.logger.warn(`System template seeding skipped: ${(error as Error).message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------

  async list(agencyId: string): Promise<ContentTemplate[]> {
    return this.prisma.contentTemplate.findMany({
      where: {
        OR: [
          { agencyId },
          { agencyId: ContentTemplateService.SYSTEM_AGENCY_ID, isSystem: true },
        ],
      },
      orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    });
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  async create(
    agencyId: string,
    dto: CreateTemplateDto
  ): Promise<ContentTemplate> {
    const template = await this.prisma.contentTemplate.create({
      data: {
        agencyId,
        name: dto.name,
        platform: dto.platform ?? null,
        template: dto.template,
        variables: dto.variables,
        isSystem: false,
      },
    });

    this.logger.log(
      `ContentTemplate created: id=${template.id} agencyId=${agencyId} name=${template.name}`
    );

    return template;
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  async update(
    agencyId: string,
    templateId: string,
    dto: UpdateTemplateDto
  ): Promise<ContentTemplate> {
    const existing = await this.assertExists(agencyId, templateId);

    if (existing.isSystem) {
      throw new ForbiddenException("System templates cannot be modified");
    }

    const updated = await this.prisma.contentTemplate.update({
      where: { id: templateId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.platform !== undefined && { platform: dto.platform }),
        ...(dto.template !== undefined && { template: dto.template }),
        ...(dto.variables !== undefined && { variables: dto.variables }),
      },
    });

    this.logger.log(
      `ContentTemplate updated: id=${templateId} agencyId=${agencyId}`
    );

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async remove(agencyId: string, templateId: string): Promise<void> {
    const existing = await this.assertExists(agencyId, templateId);

    if (existing.isSystem) {
      throw new ForbiddenException("System templates cannot be deleted");
    }

    await this.prisma.contentTemplate.delete({ where: { id: templateId } });

    this.logger.log(
      `ContentTemplate deleted: id=${templateId} agencyId=${agencyId}`
    );
  }

  // ---------------------------------------------------------------------------
  // Find one (for internal use)
  // ---------------------------------------------------------------------------

  async findOne(templateId: string): Promise<ContentTemplate | null> {
    return this.prisma.contentTemplate.findUnique({
      where: { id: templateId },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async assertExists(
    agencyId: string,
    templateId: string
  ): Promise<ContentTemplate> {
    const template = await this.prisma.contentTemplate.findFirst({
      where: { id: templateId, agencyId },
    });

    if (!template) {
      throw new NotFoundException(
        `ContentTemplate '${templateId}' not found in this agency`
      );
    }

    return template;
  }

  private async seedSystemTemplates(): Promise<void> {
    const existing = await this.prisma.contentTemplate.count({
      where: {
        agencyId: ContentTemplateService.SYSTEM_AGENCY_ID,
        isSystem: true,
      },
    });

    if (existing > 0) {
      this.logger.debug(
        `System templates already seeded (${existing} found) — skipping`
      );
      return;
    }

    await this.prisma.contentTemplate.createMany({
      data: SYSTEM_TEMPLATES.map((t) => ({
        agencyId: ContentTemplateService.SYSTEM_AGENCY_ID,
        name: t.name,
        platform: t.platform,
        template: t.template,
        variables: t.variables,
        isSystem: true,
      })),
      skipDuplicates: true,
    });

    this.logger.log(
      `Seeded ${SYSTEM_TEMPLATES.length} system content templates`
    );
  }
}
