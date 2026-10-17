# Frontend - Vue.js + Vite
FROM node:24-alpine AS build-stage
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
ARG VITE_APP_VERSION=dev
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine AS runtime
WORKDIR /usr/share/nginx/html

# Copy built application
COPY --from=build-stage /app/dist .

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5174

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5174/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
