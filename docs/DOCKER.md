# Notes API — Dockerization Sketch Notes

This document contains design notes and a proposed layout for dockerizing the Notes API. 

---

## Proposed Dockerfile Layout

```dockerfile
# ==============================================================================
# Build Stage
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./
COPY prisma ./prisma

# Install all dependencies (including devDependencies needed for Prisma CLI)
RUN npm ci

# Generate custom Prisma Client build mapping to "../../generated/prisma"
RUN npx prisma generate

# Copy application source code
COPY . .

# Prune devDependencies to keep the production image lean
RUN npm prune --omit=dev


# ==============================================================================
# Execution Stage (Multi-stage build to minimize image size)
# ==============================================================================
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy built artifacts and minimized node_modules from builder stage
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/generated ./generated
COPY --from=builder /usr/src/app/index.js ./index.js
COPY --from=builder /usr/src/app/models ./models
COPY --from=builder /usr/src/app/middlewares ./middlewares
COPY --from=builder /usr/src/app/utils ./utils

# Configure production environment variables
ENV NODE_ENV=production

# Expose port (must match process.env.PORT)
EXPOSE 5000

# Execute server
CMD ["node", "index.js"]
```

---

## Key Dockerization Steps & Rationale

1. **`node:20-alpine` Base Image:**
   - Standardizes on Node.js v20.
   - Built on Alpine Linux for a lightweight footprint (~5MB base image size vs ~1GB standard Debian Node base), minimizing storage overhead and security vulnerability surface area.
2. **Layered Copying (`COPY package*.json ./`):**
   - Copies dependency manifest files first.
   - If application code changes, Docker builds skip running `npm ci`, dramatically accelerating local rebuild speeds.
3. **Prisma Client Compilation (`npx prisma generate`):**
   - Since Prisma Client binaries are compiled and placed relative to the environment's architecture, we must run the client generator inside the container build context.
4. **Pruning devDependencies (`npm prune --omit=dev`):**
   - Clears out dependencies like `nodemon` and the `prisma` dev compiler CLI from `node_modules` before final execution stage copy, keeping the runner image size minimal.
5. **Multi-stage Build Pattern:**
   - Splits build stages. The final image only contains the production node_modules, generated Prisma client, and application source files. Dev dependencies and system-level caches are left behind in the builder stage.
