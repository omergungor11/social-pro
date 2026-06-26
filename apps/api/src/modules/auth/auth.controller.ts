import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { UserRole } from "@social-pro/shared-types";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { AuthService, AuthResponse, TokenPair } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateAgencyDto } from "./dto/update-agency.dto";
import { Public } from "./decorators/public.decorator";

interface RequestWithUser extends ExpressRequest {
  user: AuthenticatedUser;
}

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Register a new user and agency" })
  @ApiResponse({ status: 201, description: "User and agency created" })
  @ApiResponse({ status: 409, description: "Email already registered" })
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Log in with email and password" })
  @ApiResponse({ status: 200, description: "Authenticated successfully" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate refresh token and obtain a new token pair" })
  @ApiResponse({ status: 200, description: "Tokens rotated" })
  @ApiResponse({ status: 401, description: "Invalid or expired refresh token" })
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenPair> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Invalidate the current session (no-op for JWT)" })
  @ApiResponse({ status: 204, description: "Logged out" })
  logout(): void {
    // With stateless JWTs the client is responsible for discarding tokens.
    // When refresh-token DB storage is added this method will delete the record.
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current authenticated user and agency info" })
  @ApiResponse({ status: 200, description: "Current user profile" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async me(@Request() req: RequestWithUser): Promise<
    Awaited<ReturnType<AuthService["getMe"]>>
  > {
    const { id, agencyId } = req.user;
    return this.authService.getMe(id, agencyId);
  }

  @Patch("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the current user's profile" })
  @ApiResponse({ status: 200, description: "Profile updated" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async updateProfile(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateProfileDto
  ): Promise<Awaited<ReturnType<AuthService["updateProfile"]>>> {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Patch("agency")
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update agency settings (name, slug, timezone)" })
  @ApiResponse({ status: 200, description: "Agency updated" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 409, description: "Slug already in use" })
  async updateAgency(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateAgencyDto
  ): Promise<Awaited<ReturnType<AuthService["updateAgency"]>>> {
    return this.authService.updateAgency(req.user.agencyId, dto);
  }
}
