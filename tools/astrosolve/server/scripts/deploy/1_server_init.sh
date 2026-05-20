#!/usr/bin/env bash

# =============================================================================
# 1_server_init.sh — Astrosolve Remote Server Setup
# =============================================================================
# One-time bootstrap script that prepares a fresh Ubuntu (Hetzner) server
# for running the Astrosolve backend. This script only handles initial setup:
#   - Installs Docker (via server_init_docker.sh)
#   - Creates a dedicated deploy user with SSH access
#   - Creates the application directory structure
#   - Writes the runtime .env configuration
#   - Generates compose.yaml (via server_init_compose.sh)
#   - Installs operational scripts (deploy, restart, stop)
#
# After this script completes, use deploy.sh to pull and run the server.
#
# Usage (on the remote server as root):
#   API_DOMAIN="api.example.com" \
#   ASTROSOLVE_ORIGIN="https://example.com" \
#   GHCR_IMAGE="ghcr.io/owner/repo" \
#   ./server_init.sh
#
# Required environment variables:
#   API_DOMAIN         — The domain name for the API (e.g., api.example.com)
#   ASTROSOLVE_ORIGIN  — The frontend URL for CORS (e.g., https://example.com)
#   GHCR_IMAGE         — The GitHub Container Registry image path
#
# Optional environment variables:
#   DEPLOY_USER — Non-root user for running the app (default: deploy)
# =============================================================================

# sets bash to run in strict mode so that any error fails the script.
# -e: Exit on error. -u: Exit on unset variable. -o pipefail: Fail on pipe errors.
set -euo pipefail

# =============================================================================
# STEP 1: PRE-FLIGHT CHECKS
# =============================================================================

# Root is required because this script installs system packages, creates users,
# and writes to /opt (a system directory).
if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "Run this script as root on the server." >&2
  exit 1
fi

# SCRIPT_DIR: Resolves the absolute path of the directory containing this script.
# This is needed to locate companion scripts (server_init_docker.sh, etc.)
# regardless of where the operator runs the script from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# TARGET_DIR: /opt is the standard Linux directory for third-party application
# software. All Astrosolve files live under /opt/astrosolve.
TARGET_DIR="${APP_DIR:-/opt/astrosolve}"

# -----------------------------------------------------------------------------
# Validate required environment variables.
# The ':' (no-op) command with '${VAR:?message}' syntax causes the script to
# exit with an error if the variable is unset or empty. This catches
# misconfiguration early before any system changes are made.
# DEPLOY_USER uses '=${value}' syntax to provide a default instead of failing.
# -----------------------------------------------------------------------------
: "${DEPLOY_USER:=deploy}"
: "${API_DOMAIN:?Set API_DOMAIN, e.g. api.example.com}"
: "${ASTROSOLVE_ORIGIN:?Set ASTROSOLVE_ORIGIN, e.g. https://example.com}"
: "${GHCR_IMAGE:?Set GHCR_IMAGE, e.g. ghcr.io/owner/db-astro-suite-astrosolve}"

# -----------------------------------------------------------------------------
# Integrity check: Ensure all companion scripts are present.
# These scripts must be in the same directory as server_init.sh. They are
# typically copied to the server together via scp.
# -----------------------------------------------------------------------------
for required_script in 1a_init_docker.sh 1b_init_compose.sh 2_deploy.sh 3_restart.sh 4_stop.sh; do
  if [ ! -f "$SCRIPT_DIR/$required_script" ]; then
    echo "Missing required script: $SCRIPT_DIR/$required_script" >&2
    exit 1
  fi
done

echo "=========================================="
echo "  ASTROSOLVE SERVER INIT"
echo "=========================================="

# =============================================================================
# STEP 2: INSTALL DOCKER
# =============================================================================

# Source the Docker installation helper. 'source' (or '.') executes the script
# in the current shell context, so it shares our variables and strict mode.
# This keeps Docker-specific installation logic in its own file for readability.
echo ""
echo "--- Docker Installation ---"
source "$SCRIPT_DIR/1a_init_docker.sh"

# =============================================================================
# STEP 3: CREATE DEPLOY USER
# =============================================================================

echo ""
echo "--- User Setup ---"

# -----------------------------------------------------------------------------
# Create a dedicated non-root user for running the application.
# Security best practice: never run internet-facing applications as root.
# '--disabled-password' prevents password login (SSH key only).
# '--gecos ""' skips the interactive full name / room number prompts.
# The 'if' check makes this idempotent — safe to re-run without errors.
# -----------------------------------------------------------------------------
echo "==> Creating deploy user: $DEPLOY_USER"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi

# -----------------------------------------------------------------------------
# Add the user to required groups:
#   - sudo: Allows running administrative commands when needed.
#   - docker: Allows running Docker commands without 'sudo' prefix.
# 'usermod -aG' appends to groups without removing existing memberships.
# -----------------------------------------------------------------------------
usermod -aG sudo "$DEPLOY_USER"
usermod -aG docker "$DEPLOY_USER"

# -----------------------------------------------------------------------------
# SSH key handover: Copy root's authorized_keys to the deploy user.
# When you first set up a Hetzner server, SSH keys are added to root.
# This step copies those keys so you can SSH as the deploy user without
# manually adding keys again. File permissions are set to SSH's strict
# requirements: 700 for .ssh directory, 600 for the keys file.
# -----------------------------------------------------------------------------
echo "==> Setting up SSH keys for $DEPLOY_USER"
if [ -f /root/.ssh/authorized_keys ]; then
  mkdir -p "/home/$DEPLOY_USER/.ssh"
  cp /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
  chmod 700 "/home/$DEPLOY_USER/.ssh"
  chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi

# =============================================================================
# STEP 4: CREATE DIRECTORY STRUCTURE
# =============================================================================

echo ""
echo "--- Directory Setup ---"

# -----------------------------------------------------------------------------
# Create the application directory tree under /opt/astrosolve.
# Directory purposes:
#   data/astrometry/ — Mount point for read-only sky index files (~1GB+).
#     These are used by the astrometry solver and are too large to include
#     in the Docker image.
#   data/uploads/ — Temporary storage for astronomical images being processed
#     during plate solving. Data persists across container restarts.
#   scripts/ — Operational scripts (deploy.sh, restart.sh, stop.sh) that are
#     installed here for easy access by the deploy user and CI.
#
# 'mkdir -p' creates parent directories as needed and is idempotent.
# -----------------------------------------------------------------------------
echo "==> Creating application directories"
mkdir -p "$TARGET_DIR/data/astrometry"
mkdir -p "$TARGET_DIR/data/uploads"
mkdir -p "$TARGET_DIR/scripts"
# Pre-create the keys database file so Docker mounts it as a file, not a directory.
touch "$TARGET_DIR/data/astrosolve.sqlite"

# Set ownership of the entire directory tree to the deploy user.
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$TARGET_DIR"

# =============================================================================
# STEP 4b: SEED ASTROMETRY INDEX FILES
# =============================================================================

echo ""
echo "--- Astrometry Index Files ---"

# -----------------------------------------------------------------------------
# Download the Astrometry.net index files needed by solve-field.
# init-astrometry-db.sh is idempotent — it skips files already present, so
# re-running server init on an existing server is safe.
# The script lives two levels up in scripts/data/ relative to this file.
# -----------------------------------------------------------------------------
bash "$SCRIPT_DIR/init-astrometry-db.sh" "$TARGET_DIR/data/astrometry"

# Re-apply ownership so the deploy user owns the downloaded index files.
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$TARGET_DIR/data/astrometry"

# =============================================================================
# STEP 5: WRITE RUNTIME CONFIGURATION
# =============================================================================

echo ""
echo "--- Configuration ---"

# -----------------------------------------------------------------------------
# Write the .env file loaded by Docker Compose at runtime.
# Variables in this file:
#   API_DOMAIN        — Used for reference (not consumed by compose directly).
#   ASTROSOLVE_ORIGIN — The frontend URL for CORS configuration.
#   GHCR_IMAGE        — The Docker image path in GitHub Container Registry.
#   IMAGE_TAG         — The image version tag. Set to 'manual' as a placeholder;
#     deploy.sh overrides this with the actual tag at deploy time.
#
# The heredoc (<<EOF) writes multiple lines to the file. Variables are
# expanded by the shell (e.g., $API_DOMAIN becomes the actual value).
# -----------------------------------------------------------------------------
echo "==> Writing .env file"
cat > "$TARGET_DIR/.env" <<EOF
API_DOMAIN=$API_DOMAIN
ASTROSOLVE_ORIGIN=$ASTROSOLVE_ORIGIN
GHCR_IMAGE=$GHCR_IMAGE
IMAGE_TAG=manual
EOF

chown "$DEPLOY_USER:$DEPLOY_USER" "$TARGET_DIR/.env"

# =============================================================================
# STEP 6: GENERATE COMPOSE FILE
# =============================================================================

echo ""
echo "--- Compose Setup ---"

# Source the compose file generator. This creates compose.yaml in $TARGET_DIR.
# By sourcing it, the script has access to our TARGET_DIR and DEPLOY_USER vars.
source "$SCRIPT_DIR/1b_init_compose.sh"

# =============================================================================
# STEP 7: INSTALL OPERATIONAL SCRIPTS
# =============================================================================

echo ""
echo "--- Script Installation ---"

# -----------------------------------------------------------------------------
# Copy the operational scripts to /opt/astrosolve/scripts/ and make them
# executable. 'install -m 0755' copies the file and sets permissions in one
# step (owner: rwx, group: rx, others: rx).
#
# These scripts are what operators and CI use day-to-day:
#   2_deploy.sh  — Pull a new image and start the server
#   3_restart.sh — Restart the server with the existing image
#   4_stop.sh    — Stop the server
# -----------------------------------------------------------------------------
echo "==> Installing operational scripts"
install -m 0755 "$SCRIPT_DIR/2_deploy.sh"  "$TARGET_DIR/scripts/2_deploy.sh"
install -m 0755 "$SCRIPT_DIR/3_restart.sh" "$TARGET_DIR/scripts/3_restart.sh"
install -m 0755 "$SCRIPT_DIR/4_stop.sh"    "$TARGET_DIR/scripts/4_stop.sh"

# Set ownership to the deploy user so they can execute without sudo.
chown "$DEPLOY_USER:$DEPLOY_USER" \
  "$TARGET_DIR/scripts/2_deploy.sh" \
  "$TARGET_DIR/scripts/3_restart.sh" \
  "$TARGET_DIR/scripts/4_stop.sh"

# =============================================================================
# STEP 8: VALIDATE COMPOSE FILE
# =============================================================================

echo ""
echo "--- Validation ---"

# -----------------------------------------------------------------------------
# Dry-run the compose configuration to catch syntax errors before the first
# real deployment. 'docker compose config' parses the compose file and .env,
# then outputs the resolved configuration. We redirect to /dev/null because
# we only care about the exit code (0 = valid, non-zero = error).
# We run this as the deploy user to verify they have the right permissions.
# -----------------------------------------------------------------------------
echo "==> Validating compose file"
sudo -u "$DEPLOY_USER" docker compose --env-file "$TARGET_DIR/.env" -f "$TARGET_DIR/compose.yaml" config >/dev/null

# =============================================================================
# DONE
# =============================================================================

echo ""
echo "=========================================="
echo "  SERVER INIT COMPLETE"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Point Cloudflare DNS (A record) to this server's IP"
echo "  2. Deploy: sudo -u $DEPLOY_USER $TARGET_DIR/scripts/2_deploy.sh <tag>"
echo ""