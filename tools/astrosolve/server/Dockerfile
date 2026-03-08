FROM node:20-slim

# Install necessary system dependencies and the Astrometry.net CLI
RUN apt-get update && apt-get install -y \
    wget \
    astrometry.net \
    netpbm \
    file \
    && rm -rf /var/lib/apt/lists/*

# The index files are pre-downloaded on the host to avoid network flakes during the build.
# Copy them directly into the Astrometry.net search path where solve-field looks for catalogs.
COPY astrometry_data/ /usr/share/astrometry/data/

# Ensure the location for star catalogs is explicitly configured
RUN echo "add_path /usr/share/astrometry/data\nautoindex\ninparallel\ncpulimit 300" > /etc/astrometry.cfg

# Switch to the application directory
WORKDIR /usr/src/app

# Copy package descriptors and install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the backend codebase
COPY . .

# Ensure the uploads directory exists for `@fastify/multipart`
RUN mkdir -p uploads

# Expose the API port
EXPOSE 3000

# Start the Fastify server
CMD ["node", "src/index.js"]
