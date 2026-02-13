# SleepCore VK Bot Production Dockerfile
# =======================================
# Multi-stage build for optimized production image
#
# Build: docker build -t sleepcore-vk-bot .
# Run:   docker run -d --name vk-bot sleepcore-vk-bot

# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy workspace package files
COPY package.json package-lock.json* ./
COPY packages ./packages
COPY vk-bot/package.json vk-bot/package-lock.json* ./vk-bot/

# Install root workspace dependencies
RUN npm ci --ignore-scripts

# Install vk-bot dependencies
WORKDIR /app/vk-bot
RUN npm ci

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/vk-bot/node_modules ./vk-bot/node_modules
COPY --from=deps /app/packages ./packages

# Copy source files
COPY tsconfig.json ./
COPY src ./src
COPY vk-bot ./vk-bot

# Build shared code first (if needed)
WORKDIR /app/vk-bot

# Build TypeScript
RUN npm run build

# Clean npm cache
RUN npm cache clean --force

# Stage 3: Production
FROM node:22-alpine AS runner

# Labels (OCI standard)
LABEL org.opencontainers.image.source="https://github.com/your-org/sleepcore"
LABEL org.opencontainers.image.description="SleepCore VK Bot - AI-powered CBT-I therapy"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    wget \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Set environment
ENV NODE_ENV=production
ENV TZ=Europe/Moscow

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 sleepcore

# Copy built files and production dependencies
COPY --from=builder /app/vk-bot/dist ./dist
COPY --from=builder /app/vk-bot/node_modules ./node_modules
COPY --from=builder /app/vk-bot/package.json ./package.json

# Copy shared packages (for file: dependencies)
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/src ./src

# Create data directory
RUN mkdir -p /app/data && chown -R sleepcore:nodejs /app

# Use non-root user
USER sleepcore

# Expose port for health checks
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --spider -q http://localhost:3002/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the bot
CMD ["node", "dist/main.js"]
