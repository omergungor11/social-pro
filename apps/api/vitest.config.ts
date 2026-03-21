import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    root: path.resolve(__dirname, "src"),
    include: ["**/*.spec.ts"],
    setupFiles: [path.resolve(__dirname, "src/test/setup.ts")],
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.spec.ts",
        "src/**/*.module.ts",
        "src/main.ts",
        "src/test/**",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
      reporter: ["text", "lcov", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  esbuild: {
    // Support TypeScript decorators (emitDecoratorMetadata equivalent)
    // esbuild does not support emitDecoratorMetadata natively; we handle it
    // by using the swc transform below where needed.
    target: "es2022",
  },
});
