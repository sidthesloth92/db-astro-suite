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

# Switch to the application directory
WORKDIR /usr/src/app

# Copy package descriptors and install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the backend codebase
COPY . .

# Runtime data is mounted from the host in production so index and catalog growth
# does not require rebuilding the image.
RUN mkdir -p /usr/src/app/data/astrometry /usr/src/app/data/local-catalog /usr/src/app/data/uploads

# Expose the API port
EXPOSE 3000

# Start the Fastify server
CMD ["node", "src/index.js"]
