import { SetMetadata } from "@nestjs/common";

export const TENANT_SCOPED_KEY = "tenantScoped";

/**
 * @TenantScoped()
 *
 * Marker decorator applied to service methods that operate within a tenant
 * (agency) boundary. Serves as documentation and an audit trail signal —
 * indicates that the method relies on TenantContext for scoping its queries
 * to the current agency.
 *
 * Usage:
 *   @TenantScoped()
 *   async listPosts(): Promise<Post[]> { ... }
 */
export const TenantScoped = (): MethodDecorator =>
  SetMetadata(TENANT_SCOPED_KEY, true);
