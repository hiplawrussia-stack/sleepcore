# E2E Tests Dockerfile
FROM mcr.microsoft.com/playwright:v1.49.0-noble

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy test files
COPY . .

# Create directories for reports
RUN mkdir -p playwright-report test-results

# Run tests
CMD ["npx", "playwright", "test", "--reporter=html,list"]
