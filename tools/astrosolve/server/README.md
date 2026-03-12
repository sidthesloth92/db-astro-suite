# Astrosolve Server

A local, headless Node.js microservice utilizing the Astrometry.net engine for fast plate-solving celestial images.

## Development with Docker

To run the plate-solving server locally, you must use Docker to ensure the Astrometry.net solver and huge index catalogs are properly containerized.

> **Important Setup Step**: Make sure that **Docker Desktop is running** on your Mac before executing any of these commands!

### 1. Download the Star Catalogs

Run the downloader script to pull the necessary `index-42**` and `index-41**` Astrometry FITS index files locally. (This is a one-time step and takes several gigabytes).

```bash
cd tools/astrosolve/server
sh download-indices.sh
```

### 2. Seed the Local Celestial Database

Run the seeder on your host machine before building the image if you want the SQLite catalog bundled into the container image:

```bash
cd tools/astrosolve/server
npm run seed
```

This creates `src/data/celestial.sqlite`. With the current Dockerfile, that file is copied into the image during `docker build`.

### 3. Build the Docker Image

Run this command from the `tools/astrosolve/server` directory to build the image:

```bash
docker build -t astrosolve .
```

### 4. Run the Server (Live Reloading)

To run the server during development, use a volume mount to sync your local `./src` folder into the container, and override the default start command with `npm run dev` to enable `node --watch`:

Run this command from the `tools/astrosolve/server` directory:

```bash
docker run -p 3000:3000 \
  -v $(pwd)/src:/usr/src/app/src \
  astrosolve \
  npm run dev
```

If you are using this bind-mounted development flow, reseeding on the host updates the data the container sees immediately. You only need to restart the container; you do not need to rebuild the image.

### 5. View Logs

Once the container is running, you can view the live Fastify logs by finding the container ID with `docker ps` and streaming the output:

```bash
docker logs -f <CONTAINER_ID>
```

## Production

To build and run the server without live-reloading for production (or for testing the final build):

```bash
npm run seed
docker build -t astrosolve .
docker run -d -p 3000:3000 astrosolve
```
