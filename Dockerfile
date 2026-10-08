FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json tsconfig.json vite.config.ts ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build frontend and client bundle
RUN npm run build

# Production runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install tsx globally or locally for ts execution
COPY package.json ./
RUN npm install --omit=dev && npm install -g tsx

# Copy built assets and sources
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000

# Start command (Runs the full-stack server + quantitative trading worker)
CMD ["tsx", "server.ts"]
