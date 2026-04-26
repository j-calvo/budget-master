# Stage 1: Build the Frontend
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup the Backend & Production Image
FROM node:22-bookworm-slim

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the built frontend from the previous stage
# We keep it at /app/frontend/dist so the backend path resolution (../frontend/dist) works
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Setup backend
WORKDIR /app/backend
COPY backend/package*.json ./

# Install dependencies
RUN npm install

COPY backend/ ./
RUN npx prisma generate

# Set Production Environment Variables
ENV NODE_ENV=production
ENV PORT=5001
# We point the DB to a separate /data folder to make volume mounting easier
ENV DATABASE_URL="file:./data/dev.db"

EXPOSE 5001

# Run database migrations before starting the server
CMD npx prisma migrate deploy && node server.js
