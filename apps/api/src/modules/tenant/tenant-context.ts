import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantStore {
  agencyId: string;
  userId: string;
  role: string;
}

export class TenantContext {
  static readonly storage = new AsyncLocalStorage<TenantStore>();

  static getCurrentAgencyId(): string {
    const store = TenantContext.getStore();
    return store.agencyId;
  }

  static getCurrentUserId(): string {
    const store = TenantContext.getStore();
    return store.userId;
  }

  static getCurrentRole(): string {
    const store = TenantContext.getStore();
    return store.role;
  }

  static getStore(): TenantStore {
    const store = TenantContext.storage.getStore();
    if (!store) {
      throw new Error(
        "TenantContext: no active store — ensure TenantMiddleware is applied for this route"
      );
    }
    return store;
  }
}
