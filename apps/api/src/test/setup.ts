import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Global environment variables required by NestJS services under test
// ---------------------------------------------------------------------------
process.env["JWT_SECRET"] = "test-jwt-secret-key";
process.env["JWT_REFRESH_SECRET"] = "test-jwt-refresh-secret-key";
process.env["JWT_EXPIRES_IN"] = "15m";
process.env["JWT_REFRESH_EXPIRES_IN"] = "7d";
process.env["STRIPE_SECRET_KEY"] = "sk_test_placeholder";
process.env["BILLING_SUCCESS_URL"] = "http://localhost:3000/billing?success=true";
process.env["BILLING_CANCEL_URL"] = "http://localhost:3000/billing?cancelled=true";
process.env["BILLING_PORTAL_RETURN_URL"] = "http://localhost:3000/billing";

// ---------------------------------------------------------------------------
// Mock BullMQ — prevent any real Redis connections in unit tests
// ---------------------------------------------------------------------------
vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: "mock-job-id" }),
    getJob: vi.fn().mockResolvedValue(null),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    close: vi.fn().mockResolvedValue(undefined),
  })),
  QueueEvents: vi.fn().mockImplementation(() => ({
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// ---------------------------------------------------------------------------
// Mock ioredis — prevent real Redis connections
// ---------------------------------------------------------------------------
vi.mock("ioredis", () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Reset all mocks between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
