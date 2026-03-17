import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { IS_PUBLIC_KEY } from "./decorators/public.decorator";

export interface JwtPayload {
  sub: string;
  agencyId: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException("No bearer token provided");
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env["JWT_SECRET"],
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }

    // Populate request.user with the shape AuthenticatedUser expects.
    // email and name are not stored in the JWT — they are available only via
    // GET /auth/me which fetches the full profile from the DB.
    const authenticatedUser: AuthenticatedUser = {
      id: payload.sub,
      email: "",
      name: "",
      agencyId: payload.agencyId,
      role: payload.role,
    };

    (request as Request & { user: AuthenticatedUser }).user = authenticatedUser;

    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const authorization = request.headers["authorization"];
    if (!authorization) return undefined;

    const [scheme, token] = authorization.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) return undefined;

    return token;
  }
}
