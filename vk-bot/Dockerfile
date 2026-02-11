# SleepCore VK Bot Dockerfile
# ===========================
# Multi-stage build for production deployment

FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Build stage
FROM base AS builder
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM base AS runner
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sleepcore
USER sleepcore

# Copy built files
COPY --from=deps --chown=sleepcore:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=sleepcore:nodejs /app/dist ./dist
COPY --from=builder --chown=sleepcore:nodejs /app/package.json ./

# Start the bot
CMD ["node", "dist/index.js"]
