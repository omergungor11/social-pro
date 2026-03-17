import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { UserRole } from "@social-pro/shared-types";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { AuthenticatedUser } from "../decorators/current-user.decorator";

/**
 * Numeric rank for each role — higher is more privileged.
 * OWNER(3) > ADMIN(2) > EDITOR(1) > VIEWER(0)
 */
const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.OWNER]: 3,
  [UserRole.ADMIN]: 2,
  [UserRole.EDITOR]: 1,
  [UserRole.VIEWER]: 0,
};

function hasRequiredRole(
  userRole: UserRole,
  requiredRoles: UserRole[]
): boolean {
  const userRank = ROLE_RANK[userRole];
  return requiredRoles.some((required) => userRank >= ROLE_RANK[required]);
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // No @Roles() decorator — route is open to any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();

    const user = request.user;

    if (!user?.role) {
      throw new ForbiddenException("No role assigned to the current user");
    }

    const userRole = user.role as UserRole;

    if (!hasRequiredRole(userRole, requiredRoles)) {
      throw new ForbiddenException(
        `Role '${userRole}' is not allowed to access this resource`
      );
    }

    return true;
  }
}
