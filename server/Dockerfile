# Backend - Node.js + Express
FROM node:24-alpine AS base
WORKDIR /app

# Dependencies stage
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build stage (if needed for dependencies)
FROM base AS build
COPY package*.json ./
RUN npm ci

# Runtime stage
FROM base AS runtime
ENV NODE_ENV=production
EXPOSE 3000

# Run as the unprivileged "node" user; /data holds the optional SQLite file
RUN mkdir -p /data && chown node:node /app /data

# Copy production dependencies
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules

# Copy application code
COPY --chown=node:node . .

USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/healthz', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "index.js"]
