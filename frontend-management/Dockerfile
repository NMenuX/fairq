# =============================================================================
# FairQ Management Frontend Dockerfile
# =============================================================================

FROM node:20-alpine AS builder
WORKDIR /app
# Copy source code
COPY . /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Install and build
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
