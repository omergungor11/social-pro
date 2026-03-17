import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { TenantService, AgencyWithPlan } from "./tenant.service";

export interface TenantRequest extends Request {
  user: AuthenticatedUser;
  agency: AgencyWithPlan;
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantService: TenantService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantRequest>();
    const user = request.user;

    if (!user?.id || !user?.agencyId) {
      throw new UnauthorizedException(
        "TenantGuard: user or agencyId missing from request — ensure AuthGuard runs first"
      );
    }

    // Validate user is an active member of the agency and retrieve agency data
    await this.tenantService.validateMembership(user.id, user.agencyId);

    const agency = await this.tenantService.getAgency(user.agencyId);

    // Attach resolved agency to the request for downstream handlers
    request.agency = agency;

    return true;
  }
}
