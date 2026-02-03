# =============================================================================
# FairQ Kiosk Frontend Dockerfile
# =============================================================================
# Builds the React app and serves it with Nginx
# =============================================================================

# Stage 1: Build the React app
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the production bundle
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files to Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config (optional)
COPY nginx.conf /etc/nginx/conf.d/default.conf 2>/dev/null || true

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
