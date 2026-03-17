import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Agency, AgencyMember, Plan, Prisma, UserRole } from "@social-pro/prisma";
import { PrismaService } from "../common/prisma/prisma.service";

export type AgencyWithPlan = Agency & { plan: Plan | null };

export type UpdateAgencyData = Prisma.AgencyUpdateInput;

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async getAgency(agencyId: string): Promise<AgencyWithPlan> {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      include: { plan: true },
    });

    if (!agency) {
      throw new NotFoundException(`Agency with id '${agencyId}' not found`);
    }

    return agency;
  }

  async updateAgency(
    agencyId: string,
    data: UpdateAgencyData
  ): Promise<AgencyWithPlan> {
    const existing = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`Agency with id '${agencyId}' not found`);
    }

    return this.prisma.agency.update({
      where: { id: agencyId },
      data,
      include: { plan: true },
    });
  }

  async getAgencyBySlug(slug: string): Promise<AgencyWithPlan> {
    const agency = await this.prisma.agency.findUnique({
      where: { slug },
      include: { plan: true },
    });

    if (!agency) {
      throw new NotFoundException(`Agency with slug '${slug}' not found`);
    }

    return agency;
  }

  async validateMembership(
    userId: string,
    agencyId: string
  ): Promise<UserRole> {
    const member = await this.prisma.agencyMember.findUnique({
      where: { agencyId_userId: { agencyId, userId } },
      select: { role: true },
    });

    if (!member) {
      throw new UnauthorizedException(
        `User '${userId}' is not a member of agency '${agencyId}'`
      );
    }

    return member.role;
  }

  async generateSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const existing = await this.prisma.agency.findUnique({
      where: { slug: base },
      select: { id: true },
    });

    if (!existing) {
      return base;
    }

    // Slug is taken — find the highest suffix already in use and increment
    const similar = await this.prisma.agency.findMany({
      where: { slug: { startsWith: `${base}-` } },
      select: { slug: true },
    });

    const suffixPattern = new RegExp(`^${base}-(\\d+)$`);
    const usedNumbers = similar
      .map((a: { slug: string }) => {
        const match = suffixPattern.exec(a.slug);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n: number | null): n is number => n !== null);

    const next = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 2;

    return `${base}-${next}`;
  }
}
