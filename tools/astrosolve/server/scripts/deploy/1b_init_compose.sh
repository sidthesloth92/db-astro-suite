#!/usr/bin/env bash

# =============================================================================
# 1b_init_compose.sh — Docker Compose File Generator
# =============================================================================
# This script generates the compose.yaml file for the Astrosolve application.
# It is sourced (not executed) by 1_server_init.sh so that compose configuration
# stays isolated in its own readable file.
#
# Required variables (set by 1_server_init.sh before sourcing):
#   TARGET_DIR   — The application root directory (default: /opt/astrosolve)
#   DEPLOY_USER  — The non-root user who owns the deployment
#
# Architecture:
#   Cloudflare (TLS/proxy) → Server (port 80) → Docker (port 3000)
#   No reverse proxy (Caddy/nginx) is needed because Cloudflare handles TLS
#   termination, DDoS protection, and edge caching.
# =============================================================================

# sets bash to run in strict mode so that any error fails the script.
# -e: Exit on error. -u: Exit on unset variable. -o pipefail: Fail on pipe errors.
set -euo pipefail

# -----------------------------------------------------------------------------
# Validate required variables.
# These should already be set by server_init.sh before this file is sourced.
# The ':' (no-op) command with '${VAR:?msg}' syntax causes the script to exit
# with an error message if any variable is unset or empty.
# -----------------------------------------------------------------------------
: "${TARGET_DIR:?TARGET_DIR must be set before sourcing 1b_init_compose.sh}"
: "${DEPLOY_USER:?DEPLOY_USER must be set before sourcing 1b_init_compose.sh}"

echo "==> Writing compose.yaml"

# -----------------------------------------------------------------------------
# Generate the Docker Compose configuration file.
#
# Service: astrosolve
#   - image: Uses the GHCR image and tag from the .env file. The ${} syntax
#     is intentionally unescaped inside the heredoc so Docker Compose resolves
#     them at runtime from the --env-file.
#   - restart: 'unless-stopped' means the container auto-restarts after crashes
#     or server reboots, but stays stopped if manually stopped.
#   - ports: Maps host port 80 to container port 3000. Cloudflare connects to
#     port 80 over HTTP, so no TLS is needed on the server itself.
#   - environment:
#       ASTROSOLVE_ORIGIN: The allowed CORS origin for the frontend. Prevents
#         browsers from blocking cross-origin requests.
#       NODE_ENV: Tells Express to use production optimizations.
#       TRUST_PROXY: Tells Express to trust X-Forwarded-* headers from
#         Cloudflare, so req.ip and req.protocol are correct.
#   - volumes:
#       astrometry data: Read-only mount (:ro) of sky index files. These are
#         large (~1GB+) and live on the host, not in the Docker image.
#       uploads: Read-write mount for temporary image uploads during plate
#         solving. Data persists across container restarts.
#
# The heredoc uses 'EOF' (single-quoted) to prevent the shell from expanding
# ${GHCR_IMAGE} and ${IMAGE_TAG} — those are Docker Compose variables resolved
# at runtime from the .env file, not shell variables.
# -----------------------------------------------------------------------------
cat > "$TARGET_DIR/compose.yaml" <<EOF
services:
  astrosolve:
    image: \${GHCR_IMAGE}:\${IMAGE_TAG}
    restart: unless-stopped
    ports:
      - "80:3000"
    environment:
      ASTROSOLVE_ORIGIN: \${ASTROSOLVE_ORIGIN}
      NODE_ENV: production
      TRUST_PROXY: "true"
    volumes:
      - $TARGET_DIR/data/astrometry:/usr/src/app/data/astrometry:ro
      - $TARGET_DIR/data/uploads:/usr/src/app/data/uploads
      - $TARGET_DIR/data/astrosolve.sqlite:/usr/src/app/data/astrosolve.sqlite
EOF

# -----------------------------------------------------------------------------
# Set file ownership to the deploy user.
# The compose file needs to be readable by the deploy user who runs deployments.
# -----------------------------------------------------------------------------
chown "$DEPLOY_USER:$DEPLOY_USER" "$TARGET_DIR/compose.yaml"

echo "==> compose.yaml written to $TARGET_DIR/compose.yaml"
