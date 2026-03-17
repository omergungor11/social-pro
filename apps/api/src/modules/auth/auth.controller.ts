import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { AuthService, AuthResponse, TokenPair } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
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
}
