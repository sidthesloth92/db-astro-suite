#!/usr/bin/env bash

# =============================================================================
# 3_restart.sh — Restart Astrosolve Server
# =============================================================================
# Stops the running Astrosolve containers and restarts them using the existing
# (already pulled) Docker image. No new image is pulled — use deploy.sh if you
# need to deploy a different version. Use 2_deploy.sh for that.
#
# Usage:
#   3_restart.sh
#
# Common use cases:
#   - The server is misbehaving and you want a clean restart.
#   - You updated the .env file and need the container to pick up new values.
#   - The container entered an unhealthy state.
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
# Step 3: Stop all running containers.
# 'docker compose down' gracefully stops containers by sending SIGTERM, waits
# for them to shut down, then removes the stopped containers and networks.
# '|| true' ensures the script continues even if no containers were running.
# -----------------------------------------------------------------------------
echo "==> Stopping containers"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down || true

# -----------------------------------------------------------------------------
# Step 4: Start the containers in detached mode.
# 'docker compose up -d' uses the existing local image (no pull).
# The '--env-file' flag loads runtime variables (GHCR_IMAGE, IMAGE_TAG, etc.)
# from the .env file. '-d' runs containers in the background.
# -----------------------------------------------------------------------------
echo "==> Starting containers"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --pull never

# -----------------------------------------------------------------------------
# Step 5: Print status to confirm the restart succeeded.
# Shows container names, status, and ports so the operator can verify.
# -----------------------------------------------------------------------------
echo ""
echo "==> Restart complete"
echo ""
echo "Running containers:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
