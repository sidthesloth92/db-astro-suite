# ── Stage 1: build ───────────────────────────────────────────────────────────
# Installs native build tools so better-sqlite3 (and any other native addons)
# can compile from source when no prebuilt binary matches the platform/arch.
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
# Lean production image — no build toolchain, only runtime system deps.
FROM node:20-slim

# Install necessary system dependencies and the Astrometry.net CLI
RUN apt-get update && apt-get install -y \
    wget \
    astrometry.net \
    netpbm \
    file \
    && rm -rf /var/lib/apt/lists/*

# Ensure the location for star catalogs is explicitly configured
RUN echo "add_path /usr/src/app/data/astrometry\nautoindex\ninparallel\ncpulimit 300" > /etc/astrometry.cfg

WORKDIR /usr/src/app

# Bring across the compiled node_modules from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy the rest of the backend codebase
COPY . .

# Runtime data is mounted from the host in production so index and catalog growth
# does not require rebuilding the image.
RUN mkdir -p /usr/src/app/data/astrometry /usr/src/app/data/local-catalog /usr/src/app/data/uploads

# Expose the API port
EXPOSE 3000

# Start the Fastify server
CMD ["node", "src/index.js"]
