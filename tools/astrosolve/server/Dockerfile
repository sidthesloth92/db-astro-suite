FROM node:20-slim

# Install necessary system dependencies for ASTAP and downloading packages
RUN apt-get update && apt-get install -y \
    wget \
    libgtk2.0-0 \
    libcfitsio-bin \
    && rm -rf /var/lib/apt/lists/*

# Set working directory for download operations
WORKDIR /tmp

# Download and install the ASTAP command line executable
RUN wget https://www.hnsky.org/astap_amd64.deb \
    && dpkg -i astap_amd64.deb \
    && rm astap_amd64.deb

# Download and install the D50 star database (needed for ASTAP to solve images)
RUN wget -O d50_setup.deb https://www.hnsky.org/d50_star_database.deb \
    && dpkg -i d50_setup.deb \
    && rm d50_setup.deb

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
