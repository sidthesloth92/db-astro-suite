#!/usr/bin/env bash

# =============================================================================
# 2_deploy.sh — Pull Image & Deploy Astrosolve
# =============================================================================
# This is the primary deployment script used by both CI (GitHub Actions) and
# manual operator deploys. It:
#   1. Stops any running containers
#   2. Pulls the requested Docker image tag from GHCR
#   3. Starts the server with the new image
#
# Usage:
#   2_deploy.sh <image-tag>
#
# Examples:
#   2_deploy.sh v1.2.3                    # Deploy a specific release
#   2_deploy.sh v20240324                  # Deploy by date tag
#   GHCR_USERNAME=owner GHCR_TOKEN=xxx 2_deploy.sh v1.2.3  # With auth
#
# Environment variables (optional):
#   GHCR_USERNAME / GHCR_TOKEN — GHCR credentials for private images.
#     CI provides these automatically; manual operators can omit them if
#     already authenticated via 'docker login'.
#   ASTROSOLVE_BASE_DIR — Override the application root (default: /opt/astrosolve)
# =============================================================================

# sets bash to run in strict mode so that any error fails the script.
# -e: Exit on error. -u: Exit on unset variable. -o pipefail: Fail on pipe errors.
set -euo pipefail

# -----------------------------------------------------------------------------
# Step 1: Validate arguments.
# Exactly one argument is required: the Docker image tag to deploy.
# -----------------------------------------------------------------------------
if [ $# -lt 1 ]; then
  echo "Usage: 2_deploy.sh <image-tag>" >&2
  echo "Example: 2_deploy.sh v1.2.3" >&2
  exit 1
fi

# Store the requested image tag from the command line argument.
IMAGE_TAG="$1"

# -----------------------------------------------------------------------------
# Step 2: Set up paths.
# BASE_DIR defaults to /opt/astrosolve but can be overridden for testing.
# ENV_FILE contains runtime configuration (GHCR_IMAGE, ASTROSOLVE_ORIGIN, etc).
# COMPOSE_FILE is the Docker Compose service definition.
# -----------------------------------------------------------------------------
BASE_DIR="${APP_DIR:-/opt/astrosolve}"
ENV_FILE="$BASE_DIR/.env"
COMPOSE_FILE="$BASE_DIR/compose.yaml"

# -----------------------------------------------------------------------------
# Step 3: Validate prerequisites.
# Both files must exist before we attempt a deployment. They are created by
# 1_server_init.sh during initial server setup.
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
# Step 4: Source existing .env to get GHCR_IMAGE and other runtime vars.
# IMAGE_TAG is not yet updated — we source the current state first.
# -----------------------------------------------------------------------------
set -a
. "$ENV_FILE"
set +a

# -----------------------------------------------------------------------------
# Step 5: Authenticate with GitHub Container Registry (GHCR) if credentials
# are provided. CI pipelines pass these via environment variables. Manual
# operators who have already run 'docker login ghcr.io' can skip this.
# -----------------------------------------------------------------------------
if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
  echo "==> Authenticating with GHCR"
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

# -----------------------------------------------------------------------------
# Step 6: Pull the image before touching anything on the server.
# If the pull fails (bad tag, network error, auth issue) the script stops here
# and the currently running container is left untouched.
# -----------------------------------------------------------------------------
if [ -z "${SKIP_PULL:-}" ]; then
  echo "==> Pulling image: ${GHCR_IMAGE}:${IMAGE_TAG}"
  docker pull "${GHCR_IMAGE}:${IMAGE_TAG}"
else
  echo "==> Skipping pull (SKIP_PULL set) — using pre-loaded image ${GHCR_IMAGE}:${IMAGE_TAG}"
fi

# -----------------------------------------------------------------------------
# Step 7: Stop any currently running containers.
# Only reached if the pull succeeded.
# -----------------------------------------------------------------------------
echo "==> Stopping running containers"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down || true

# -----------------------------------------------------------------------------
# Step 8: Persist the new IMAGE_TAG to .env so 3_restart.sh uses the correct
# tag without needing arguments. Only written after a successful pull.
# -----------------------------------------------------------------------------
if grep -q '^IMAGE_TAG=' "$ENV_FILE"; then
  sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$IMAGE_TAG/" "$ENV_FILE"
else
  echo "IMAGE_TAG=$IMAGE_TAG" >> "$ENV_FILE"
fi

# -----------------------------------------------------------------------------
# Step 9: Start the containers in detached mode.
# '-d' runs containers in the background. Docker Compose reads the compose
# file and the .env to configure the service.
# -----------------------------------------------------------------------------
echo "==> Starting containers"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

# -----------------------------------------------------------------------------
# Step 10: Clean up old, unused Docker images to reclaim disk space.
# 'docker image prune -f' removes dangling images (untagged layers from
# previous deploys). The '-f' flag skips the confirmation prompt.
# Errors are suppressed with '|| true' since cleanup is non-critical.
# -----------------------------------------------------------------------------
echo "==> Pruning old images"
docker image prune -f >/dev/null 2>&1 || true

# -----------------------------------------------------------------------------
# Step 11: Print deployment summary.
# Shows the running containers so the operator can verify the deployment.
# -----------------------------------------------------------------------------
echo ""
echo "==> Deployment complete: ${GHCR_IMAGE}:${IMAGE_TAG}"
echo ""
echo "Running containers:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
