# =============================================================================
# FairQ Kiosk Frontend Dockerfile
# =============================================================================
# Builds the React app and serves it with Nginx
# =============================================================================

# Stage 1: Build the React app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy source code (files only, respected by .dockerignore)
COPY . /app

# Install and build
RUN npm ci && npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files to Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config (optional)
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
