# ---- Base ----
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/config-ts/package.json ./packages/config-ts/
COPY packages/config-eslint/package.json ./packages/config-eslint/
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM deps AS build
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm --filter @social-pro/prisma exec prisma generate
RUN pnpm --filter api build

# ---- Production ----
FROM node:22-alpine AS production
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

ENV NODE_ENV=production

# Copy built output and dependencies
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/packages/prisma/prisma ./packages/prisma/prisma
COPY --from=build /app/packages/prisma/package.json ./packages/prisma/
COPY --from=build /app/packages/shared-types/ ./packages/shared-types/
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/packages/prisma/node_modules ./packages/prisma/node_modules
COPY --from=build /app/pnpm-lock.yaml ./
COPY --from=build /app/package.json ./

# Non-root user
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

CMD ["node", "apps/api/dist/main.js"]
