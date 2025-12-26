# SleepCore Bot Production Dockerfile
# ====================================
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files and local packages
COPY package*.json ./
COPY packages ./packages

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine AS production

# Labels
LABEL org.opencontainers.image.source="https://github.com/your-org/sleepcore"
LABEL org.opencontainers.image.description="SleepCore Telegram Bot"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache \
    wget \
    dumb-init

# Set environment
ENV NODE_ENV=production
ENV TZ=Europe/Moscow

# Copy built files and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create data directory
RUN mkdir -p /app/data && chown -R node:node /app

# Use non-root user
USER node

# Expose port for health checks
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --spider -q http://localhost:3000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the bot
CMD ["node", "dist/main.js"]
