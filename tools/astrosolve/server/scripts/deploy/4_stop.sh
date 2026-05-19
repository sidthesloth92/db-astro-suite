#!/usr/bin/env bash

# =============================================================================
# 4_stop.sh — Stop Astrosolve Server
# =============================================================================
# Gracefully stops all running Astrosolve containers and removes them.
# The Docker image and persistent data (astrometry indexes, uploads) are
# preserved — only the running containers and their networks are removed.
#
# Usage:
#   4_stop.sh
#
# To start the server again, use 3_restart.sh or 2_deploy.sh.
#
# Environment variables (optional):
#   ASTROSOLVE_BASE_DIR — Override the application root (default: /opt/astrosolve)
# =============================================================================

# sets bash to run in strict mode so that any error fails the script.
# -e: Exit on error. -u: Exit on unset variable. -o pipefail: Fail on pipe errors.
set -euo pipefail

# -----------------------------------------------------------------------------
# Step 1: Set up paths.
# BASE_DIR defaults to /opt/astrosolve but can be overridden for testing.
# -----------------------------------------------------------------------------
BASE_DIR="${APP_DIR:-/opt/astrosolve}"
ENV_FILE="$BASE_DIR/.env"
COMPOSE_FILE="$BASE_DIR/compose.yaml"

# -----------------------------------------------------------------------------
# Step 2: Validate prerequisites.
# Both files must exist — they are created by server_init.sh during setup.
# -----------------------------------------------------------------------------
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing environment file: $ENV_FILE" >&2
  echo "Run 1_server_init.sh first to set up the server." >&2
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Missing compose file: $COMPOSE_FILE" >&2
  echo "Run 1_server_init.sh first to set up the server." >&2
  exit 1
fi

# -----------------------------------------------------------------------------
# Step 3: Stop and remove all containers.
# 'docker compose down' sends SIGTERM to each container, waits for graceful
# shutdown (default 10 seconds), then removes the stopped containers and
# any networks created by 'docker compose up'.
#
# What is preserved:
#   - Docker images (can be reused by restart.sh without re-pulling)
#   - Persistent data in /opt/astrosolve/data/ (astrometry indexes, uploads)
#   - Configuration files (.env, compose.yaml)
#
# What is removed:
#   - Running containers
#   - Docker networks created by compose
# -----------------------------------------------------------------------------
echo "==> Stopping Astrosolve containers"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down

echo ""
echo "==> Server stopped"
echo "    Data and images are preserved."
echo "    Use 3_restart.sh or 2_deploy.sh to start again."
