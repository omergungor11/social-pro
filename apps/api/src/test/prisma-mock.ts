import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Prisma model delegate mock factory
// Each model delegate exposes the standard Prisma client methods as vi.fn().
// ---------------------------------------------------------------------------

type MockFn = ReturnType<typeof vi.fn>;

interface PrismaModelMock {
  findUnique: MockFn;
  findUniqueOrThrow: MockFn;
  findFirst: MockFn;
  findFirstOrThrow: MockFn;
  findMany: MockFn;
  create: MockFn;
  createMany: MockFn;
  update: MockFn;
  updateMany: MockFn;
  upsert: MockFn;
  delete: MockFn;
  deleteMany: MockFn;
  count: MockFn;
  aggregate: MockFn;
  groupBy: MockFn;
}

function createModelMock(): PrismaModelMock {
  return {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    findFirstOrThrow: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Full Prisma service mock — covers every model used across the codebase.
// Add additional models here when new Prisma models are introduced.
// ---------------------------------------------------------------------------

export interface MockPrismaService {
  user: PrismaModelMock;
  agency: PrismaModelMock;
  agencyMember: PrismaModelMock;
  client: PrismaModelMock;
  clientGroup: PrismaModelMock;
  clientGroupMembership: PrismaModelMock;
  socialAccount: PrismaModelMock;
  post: PrismaModelMock;
  postTarget: PrismaModelMock;
  postMedia: PrismaModelMock;
  postApproval: PrismaModelMock;
  plan: PrismaModelMock;
  usageRecord: PrismaModelMock;
  notification: PrismaModelMock;
  auditLog: PrismaModelMock;
  $transaction: MockFn;
  $connect: MockFn;
  $disconnect: MockFn;
}

/**
 * Creates a complete mock of PrismaService with all model delegates
 * and transaction support.
 *
 * Usage:
 *   const prisma = createPrismaMock();
 *   prisma.user.findUnique.mockResolvedValue({ id: '1', ... });
 */
export function createPrismaMock(): MockPrismaService {
  const mock: MockPrismaService = {
    user: createModelMock(),
    agency: createModelMock(),
    agencyMember: createModelMock(),
    client: createModelMock(),
    clientGroup: createModelMock(),
    clientGroupMembership: createModelMock(),
    socialAccount: createModelMock(),
    post: createModelMock(),
    postTarget: createModelMock(),
    postMedia: createModelMock(),
    postApproval: createModelMock(),
    plan: createModelMock(),
    usageRecord: createModelMock(),
    notification: createModelMock(),
    auditLog: createModelMock(),

    // $transaction executes the callback with the mock itself as the tx arg,
    // or when called with an array of promises, resolves all of them.
    $transaction: vi.fn().mockImplementation(
      (arg: unknown) => {
        if (typeof arg === "function") {
          return (arg as (tx: MockPrismaService) => Promise<unknown>)(mock);
        }
        if (Array.isArray(arg)) {
          return Promise.all(arg as Promise<unknown>[]);
        }
        return Promise.resolve(arg);
      }
    ),

    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
  };

  return mock;
}

/**
 * Resets all mock functions on an existing MockPrismaService instance.
 * Call this in beforeEach to ensure clean state between tests.
 */
export function resetPrismaMock(mock: MockPrismaService): void {
  const modelKeys = Object.keys(mock).filter(
    (k) => !k.startsWith("$")
  ) as (keyof Omit<MockPrismaService, "$transaction" | "$connect" | "$disconnect">)[];

  for (const model of modelKeys) {
    const delegate = mock[model] as PrismaModelMock;
    for (const method of Object.values(delegate)) {
      (method as MockFn).mockReset();
    }
  }

  mock.$transaction.mockReset();
  mock.$transaction.mockImplementation(
    (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (tx: MockPrismaService) => Promise<unknown>)(mock);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg as Promise<unknown>[]);
      }
      return Promise.resolve(arg);
    }
  );

  mock.$connect.mockReset();
  mock.$disconnect.mockReset();
}
