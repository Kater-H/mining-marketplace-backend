# Mining Marketplace Backend - Production Dockerfile
# Multi-stage build optimized for AWS deployment with security and performance best practices

# =============================================================================
# Stage 1: Build Stage
# =============================================================================
# Use Node.js 20 LTS Alpine for smaller image size and better security
FROM node:20-alpine AS builder

# Set build-time metadata labels for better container management
LABEL stage=builder
LABEL description="Build stage for Mining Marketplace Backend"
LABEL maintainer="Mining Marketplace Team"

# Install build dependencies required for native modules
# python3, make, g++ are needed for building native Node.js modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Create app directory with proper permissions
WORKDIR /app

# Copy package files first to leverage Docker layer caching
# This allows npm install to be cached if dependencies haven't changed
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
# Use npm ci for faster, reliable, reproducible builds
RUN npm ci --only=production=false

# Copy source code and configuration files
COPY . .

# Build the TypeScript application
# This compiles TypeScript to JavaScript in the dist/ directory
RUN npm run build

# Remove development dependencies to reduce image size
# Keep only production dependencies for the runtime stage
RUN npm prune --production

# =============================================================================
# Stage 2: Production Runtime Stage
# =============================================================================
# Use minimal Node.js Alpine image for production runtime
FROM node:20-alpine AS production

# Set production environment metadata
LABEL stage=production
LABEL description="Production runtime for Mining Marketplace Backend"
LABEL version="1.0.0"
LABEL maintainer="Mining Marketplace Team"

# Install runtime security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security best practices
# Running as non-root reduces security risks in production
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Change ownership of the app directory to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Copy production dependencies from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy package.json for runtime metadata
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy any additional runtime files (if needed)
# COPY --from=builder --chown=nodejs:nodejs /app/config ./config

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=8080

# Expose the application port
# Using port 8080 which is standard for containerized applications
EXPOSE 8080

# Add health check for container orchestration
# This enables AWS ECS and other orchestrators to monitor container health
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use dumb-init to handle signals properly in containers
# This ensures graceful shutdown and proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
# Use npm start which should run the compiled JavaScript from dist/
CMD ["npm", "start"]

