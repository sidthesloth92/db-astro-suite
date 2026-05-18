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
BASE_DIR="${ASTROSOLVE_BASE_DIR:-/opt/astrosolve}"
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
# Step 4: Create a temporary .env file with the overridden IMAGE_TAG.
# We copy the base .env to a temp file and override only IMAGE_TAG so that
# the original .env stays clean and reusable across releases. This means
# each deploy is self-contained and doesn't mutate persistent config.
# -----------------------------------------------------------------------------
tmp_env="$(mktemp)"

# Cleanup function removes the temp file when the script exits (success or failure).
cleanup() {
  rm -f "$tmp_env"
}

# 'trap' registers cleanup() to run on EXIT, ensuring no temp files are leaked
# even if the script crashes or is interrupted with Ctrl+C.
trap cleanup EXIT

# Copy the base config to our temporary file.
cp "$ENV_FILE" "$tmp_env"

# Override the IMAGE_TAG in the temp file. If it exists, use sed to replace it
# in-place. If it doesn't exist, append it as a new line.
if grep -q '^IMAGE_TAG=' "$tmp_env"; then
  sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$IMAGE_TAG/" "$tmp_env"
else
  echo "IMAGE_TAG=$IMAGE_TAG" >> "$tmp_env"
fi

# -----------------------------------------------------------------------------
# Step 5: Export environment variables.
# 'set -a' enables auto-export: every variable assignment after this point
# is automatically exported to child processes (i.e., docker commands).
# 'set +a' disables auto-export after sourcing.
# The '.' (dot) command sources the temp .env file into the current shell.
# -----------------------------------------------------------------------------
set -a
. "$tmp_env"
set +a

# -----------------------------------------------------------------------------
# Step 6: Authenticate with GitHub Container Registry (GHCR) if credentials
# are provided. CI pipelines pass these via environment variables. Manual
# operators who have already run 'docker login ghcr.io' can skip this.
# The ':-' syntax provides a default empty string if the variable is unset,
# preventing the 'set -u' strict mode from failing.
# -----------------------------------------------------------------------------
if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
  echo "==> Authenticating with GHCR"
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

# -----------------------------------------------------------------------------
# Step 7: Stop any currently running containers.
# 'docker compose down' gracefully stops and removes containers, networks.
# The '|| true' ensures the script continues even if no containers are running
# (which would cause 'down' to return a non-zero exit code on some versions).
# -----------------------------------------------------------------------------
echo "==> Stopping running containers"
docker compose --env-file "$tmp_env" -f "$COMPOSE_FILE" down || true

# -----------------------------------------------------------------------------
# Step 8: Pull the exact Docker image requested by the caller.
# This is done before 'docker compose up' to ensure we have the image locally.
# If the pull fails (e.g., bad tag, network error), the script stops here
# instead of starting containers with a stale image.
# -----------------------------------------------------------------------------
# SKIP_PULL=1 is set by local-test.sh when the image is pre-loaded via
# 'docker save | docker load', bypassing the need for a remote registry.
if [ -z "${SKIP_PULL:-}" ]; then
  echo "==> Pulling image: ${GHCR_IMAGE}:${IMAGE_TAG}"
  docker pull "${GHCR_IMAGE}:${IMAGE_TAG}"
else
  echo "==> Skipping pull (SKIP_PULL set) — using pre-loaded image ${GHCR_IMAGE}:${IMAGE_TAG}"
fi

# -----------------------------------------------------------------------------
# Step 9: Start the containers in detached mode.
# '-d' runs containers in the background. Docker Compose reads the compose
# file and the .env to configure the service.
# -----------------------------------------------------------------------------
echo "==> Starting containers"
docker compose --env-file "$tmp_env" -f "$COMPOSE_FILE" up -d

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
docker compose --env-file "$tmp_env" -f "$COMPOSE_FILE" ps
