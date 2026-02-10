# =============================================================================
# FairQ Management Frontend Dockerfile
# =============================================================================

FROM node:20-alpine AS builder
WORKDIR /app
# Copy source code (files only, respected by .dockerignore)
COPY . /app

# Install and build
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
