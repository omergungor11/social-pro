import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UserRole } from "@social-pro/shared-types";
import { Prisma } from "@social-pro/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateAgencyDto } from "./dto/update-agency.dto";

const DEFAULT_TIMEZONE = "UTC";

function readTimezone(settings: Prisma.JsonValue | null | undefined): string {
  if (settings && typeof settings === "object" && !Array.isArray(settings)) {
    const tz = (settings as Record<string, unknown>)["timezone"];
    if (typeof tz === "string" && tz.length > 0) return tz;
  }
  return DEFAULT_TIMEZONE;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  agencyId: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface JwtPayload {
  sub: string;
  agencyId: string;
  role: string;
}

const BCRYPT_ROUNDS = 12;

function toAgencySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException("An account with that email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const baseSlug = toAgencySlug(dto.agencyName);

    // Ensure slug uniqueness by appending a numeric suffix when needed
    const slug = await this.resolveUniqueSlug(baseSlug);

    const { user, agency, member } = await this.prisma.$transaction(
      async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            name: dto.name,
          },
        });

        const createdAgency = await tx.agency.create({
          data: {
            name: dto.agencyName,
            slug,
          },
        });

        const createdMember = await tx.agencyMember.create({
          data: {
            userId: createdUser.id,
            agencyId: createdAgency.id,
            role: UserRole.OWNER,
            acceptedAt: new Date(),
          },
        });

        return {
          user: createdUser,
          agency: createdAgency,
          member: createdMember,
        };
      }
    );

    const tokens = await this.generateTokens({
      sub: user.id,
      agencyId: agency.id,
      role: member.role,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        agencyId: agency.id,
        role: member.role,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        memberships: {
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("No account found with this email address");
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException("Incorrect password. Please try again");
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException("Your account is not linked to any agency. Please contact support");
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      agencyId: membership.agencyId,
      role: membership.role,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        agencyId: membership.agencyId,
        role: membership.role,
      },
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: process.env["JWT_REFRESH_SECRET"],
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    // Confirm user + membership still exist
    const membership = await this.prisma.agencyMember.findFirst({
      where: {
        userId: payload.sub,
        agencyId: payload.agencyId,
      },
    });

    if (!membership) {
      throw new UnauthorizedException(
        "User membership not found; please log in again"
      );
    }

    return this.generateTokens({
      sub: payload.sub,
      agencyId: payload.agencyId,
      role: membership.role,
    });
  }

  async getMe(
    userId: string,
    agencyId: string
  ): Promise<{
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    createdAt: Date;
    agency: {
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      timezone: string;
    };
    role: string;
  }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        memberships: {
          where: { agencyId },
          select: {
            role: true,
            agency: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                settings: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException("Agency membership not found");
    }

    const { settings, ...agency } = membership.agency;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      agency: { ...agency, timezone: readTimezone(settings) },
      role: membership.role,
    };
  }

  /**
   * Updates the current user's profile (display name, avatar).
   * Pass avatarUrl as an empty string to clear it.
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto
  ): Promise<{
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  }> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.avatarUrl !== undefined
          ? { avatarUrl: dto.avatarUrl === "" ? null : dto.avatarUrl }
          : {}),
      },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });
  }

  /**
   * Updates agency settings (name, slug, default timezone).
   * Timezone is stored inside the agency `settings` JSON to avoid a schema change.
   */
  async updateAgency(
    agencyId: string,
    dto: UpdateAgencyDto
  ): Promise<{
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    timezone: string;
  }> {
    const agency = await this.prisma.agency.findUniqueOrThrow({
      where: { id: agencyId },
    });

    // Guard against slug collisions with another agency
    if (dto.slug !== undefined && dto.slug !== agency.slug) {
      const taken = await this.prisma.agency.findUnique({
        where: { slug: dto.slug },
      });
      if (taken && taken.id !== agencyId) {
        throw new ConflictException("That slug is already in use");
      }
    }

    const currentSettings =
      agency.settings && typeof agency.settings === "object" && !Array.isArray(agency.settings)
        ? (agency.settings as Record<string, unknown>)
        : {};

    const nextSettings: Record<string, unknown> =
      dto.timezone !== undefined
        ? { ...currentSettings, timezone: dto.timezone }
        : currentSettings;

    const updated = await this.prisma.agency.update({
      where: { id: agencyId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        settings: nextSettings as Prisma.InputJsonValue,
      },
      select: { id: true, name: true, slug: true, logoUrl: true, settings: true },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      logoUrl: updated.logoUrl,
      timezone: readTimezone(updated.settings),
    };
  }

  async generateTokens(payload: JwtPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env["JWT_SECRET"],
        expiresIn: process.env["JWT_EXPIRES_IN"] ?? "15m",
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env["JWT_REFRESH_SECRET"],
        expiresIn: process.env["JWT_REFRESH_EXPIRES_IN"] ?? "7d",
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async resolveUniqueSlug(base: string): Promise<string> {
    const existing = await this.prisma.agency.findUnique({
      where: { slug: base },
    });
    if (!existing) return base;

    // Find all agencies whose slug starts with base to pick next suffix
    const siblings = await this.prisma.agency.findMany({
      where: { slug: { startsWith: `${base}-` } },
      select: { slug: true },
    });

    const takenNumbers = siblings
      .map((a) => {
        const suffix = a.slug.slice(base.length + 1);
        return parseInt(suffix, 10);
      })
      .filter((n) => !isNaN(n));

    const next = takenNumbers.length > 0 ? Math.max(...takenNumbers) + 1 : 2;
    return `${base}-${next}`;
  }
}
