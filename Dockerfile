# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20-alpine

# -----------------------------------------------------------------------------
# Stage 1: deps — install dependencies
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Enable pnpm via corepack (matches packageManager field in root package.json)
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy lockfile and workspace manifests (layer caching: only re-install when these change)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

# Install all dependencies (dev + prod needed for build)
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2: builder — build the Next.js app
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy installed deps from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages

# Copy all source
COPY . .

# Ensure public directory exists (prevents COPY failure in runner stage)
RUN mkdir -p apps/web/public

# Build-time env vars — inlined into the client bundle
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}

# Build the Next.js app (standalone output)
RUN pnpm --filter web build

# Verify standalone output exists (monorepo-mirrored path due to outputFileTracingRoot)
RUN test -f apps/web/.next/standalone/apps/web/server.js \
  || (echo "ERROR: standalone build failed — server.js not found" && exit 1)

# -----------------------------------------------------------------------------
# Stage 3: runner — minimal production image
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy standalone output (includes traced node_modules for all workspace packages)
# The standalone directory mirrors the monorepo structure: apps/web/server.js
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone /app

# Set working directory to where server.js lives
WORKDIR /app/apps/web

# Copy static assets (required for CSS/JS served by Next.js)
COPY --from=builder --chown=node:node /app/apps/web/.next/static /app/apps/web/.next/static

# Copy public assets (empty directory is fine — created during builder stage)
COPY --from=builder --chown=node:node /app/apps/web/public /app/apps/web/public

# Copy entrypoint script
COPY --chown=node:node scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Run as non-root user (node user is pre-created in node:20-alpine with UID 1000)
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000 > /dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
