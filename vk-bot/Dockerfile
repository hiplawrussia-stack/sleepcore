# SleepCore VK Bot Dockerfile
# ===========================
# Runtime TypeScript execution for development/early deployment

FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
# Copy both vk-bot and shared src
COPY vk-bot/package.json vk-bot/package-lock.json* ./vk-bot/
COPY package.json package-lock.json* ./

# Install vk-bot dependencies
WORKDIR /app/vk-bot
RUN npm ci

# Production stage
FROM base AS runner
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sleepcore

# Copy dependencies and source code
COPY --from=deps /app/vk-bot/node_modules ./vk-bot/node_modules
COPY vk-bot ./vk-bot
COPY src ./src

# Set working directory
WORKDIR /app/vk-bot

# Change ownership
RUN chown -R sleepcore:nodejs /app
USER sleepcore

# Start the bot using tsx for TypeScript execution
CMD ["npx", "tsx", "src/main.ts"]
