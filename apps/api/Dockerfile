FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace apps/api --workspace packages/shared

# Copy source code
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build the API
RUN npm run api:build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

# Install production dependencies only
RUN npm ci --workspace apps/api --workspace packages/shared --omit=dev

# Copy built files
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Set environment
ENV NODE_ENV=production
ENV API_PORT=4000

EXPOSE 4000

WORKDIR /app/apps/api

CMD ["node", "dist/main.js"]
