import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { TenantContext } from "./tenant-context";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";

type AuthRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: AuthRequest, _res: Response, next: NextFunction): void {
    const user = req.user;

    if (!user?.id || !user?.agencyId) {
      // No authenticated user yet — continue without tenant context
      // AuthGuard will enforce authentication on protected routes
      next();
      return;
    }

    const store = {
      agencyId: user.agencyId,
      userId: user.id,
      role: user.role ?? "",
    };

    TenantContext.storage.run(store, () => {
      next();
    });
  }
}
