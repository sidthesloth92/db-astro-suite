#!/usr/bin/env bash

# =============================================================================
# 5_teardown.sh — Full Server Cleanup
# =============================================================================
# Removes everything installed by 1_server_init.sh, returning the server to its
# original clean state. This is a DESTRUCTIVE operation that:
#   - Stops and removes all Docker containers, images, and volumes
#   - Deletes the /opt/astrosolve directory and all data within it
#   - Removes the deploy user and their home directory
#   - Uninstalls Docker and its dependencies
#   - Removes Docker's apt repository and GPG key
#
# Usage:
#   5_teardown.sh
#
# Prerequisites: Must be run as root.
#
# WARNING: This will permanently delete all Astrosolve data including
# astrometry indexes and uploaded images. Back up any data you need first.
# =============================================================================

# sets bash to run in strict mode so that any error fails the script.
# -e: Exit on error. -u: Exit on unset variable. -o pipefail: Fail on pipe errors.
set -euo pipefail

# -----------------------------------------------------------------------------
# Step 1: Verify root privileges.
# Root is required to uninstall system packages, delete users, and remove
# files owned by other users.
# -----------------------------------------------------------------------------
if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "Run this script as root." >&2
  exit 1
fi

# Configuration: The deploy user and application directory to clean up.
DEPLOY_USER="${DEPLOY_USER:-deploy}"
TARGET_DIR="/opt/astrosolve"

# -----------------------------------------------------------------------------
# Step 2: Safety confirmation prompt.
# This is a destructive operation that cannot be undone. The operator must
# explicitly type 'yes' to proceed. Any other input aborts the script.
# We use '/dev/tty' to read from the terminal directly, which works even
# when the script is piped or redirected.
# -----------------------------------------------------------------------------
echo "=========================================="
echo "  ASTROSOLVE SERVER TEARDOWN"
echo "=========================================="
echo ""
echo "This will PERMANENTLY:"
echo "  - Stop and remove all Docker containers and images"
echo "  - Delete $TARGET_DIR and ALL data (astrometry indexes, uploads)"
echo "  - Remove the '$DEPLOY_USER' user and their home directory"
echo "  - Uninstall Docker Engine and related packages"
echo "  - Remove Docker's apt repository and GPG key"
echo ""
read -r -p "Type 'yes' to confirm teardown: " confirmation < /dev/tty
if [ "$confirmation" != "yes" ]; then
  echo "Teardown aborted."
  exit 0
fi

# -----------------------------------------------------------------------------
# Step 3: Stop and remove all Docker containers, networks, and volumes.
# We check if Docker and the compose file exist before attempting to stop
# services, since they may have already been partially removed.
# '|| true' ensures the script continues even if commands fail (e.g., no
# containers are running, or Docker is already stopped).
# '-v' flag removes named volumes declared in the compose file.
# -----------------------------------------------------------------------------
echo ""
echo "==> Stopping Docker containers"
if command -v docker &>/dev/null && [ -f "$TARGET_DIR/compose.yaml" ]; then
  # Stop compose services if .env and compose exist.
  if [ -f "$TARGET_DIR/.env" ]; then
    docker compose --env-file "$TARGET_DIR/.env" -f "$TARGET_DIR/compose.yaml" down -v || true
  fi
fi

# -----------------------------------------------------------------------------
# Step 4: Remove ALL Docker data.
# 'docker system prune -af' removes:
#   - All stopped containers
#   - All unused networks
#   - All images (not just dangling ones, thanks to '-a')
#   - All build cache
# The '-f' flag skips the confirmation prompt.
# 'docker volume prune -f' removes all unused anonymous volumes.
# This ensures no Docker artifacts remain from any Astrosolve deployment.
# -----------------------------------------------------------------------------
if command -v docker &>/dev/null; then
  echo "==> Removing all Docker images and volumes"
  docker system prune -af || true
  docker volume prune -f || true
fi

# -----------------------------------------------------------------------------
# Step 5: Delete the application directory.
# This removes everything under /opt/astrosolve including:
#   - compose.yaml and .env configuration files
#   - data/astrometry/ (sky index files, potentially several GB)
#   - data/uploads/ (temporary uploaded images)
#   - scripts/ (deploy, restart, stop scripts)
# The '-rf' flags force recursive deletion without prompts.
# -----------------------------------------------------------------------------
echo "==> Removing application directory: $TARGET_DIR"
if [ -d "$TARGET_DIR" ]; then
  rm -rf "$TARGET_DIR"
fi

# -----------------------------------------------------------------------------
# Step 6: Remove the deploy user.
# 'userdel --remove' deletes the user account AND their home directory
# (including /home/deploy/.ssh with authorized keys).
# 'getent passwd' checks if the user exists before attempting deletion
# to avoid errors on re-runs.
# 'groupdel' removes the user's primary group if it still exists.
# -----------------------------------------------------------------------------
echo "==> Removing deploy user: $DEPLOY_USER"
if getent passwd "$DEPLOY_USER" &>/dev/null; then
  # Kill any processes owned by the user before deletion.
  pkill -u "$DEPLOY_USER" || true
  userdel --remove "$DEPLOY_USER" || true
fi
# Clean up the group if it still exists after user deletion.
if getent group "$DEPLOY_USER" &>/dev/null; then
  groupdel "$DEPLOY_USER" || true
fi

# -----------------------------------------------------------------------------
# Step 7: Stop the Docker daemon.
# We stop and disable the Docker service before uninstalling the packages.
# 'disable' prevents Docker from starting on next boot.
# 'stop' shuts down the running daemon.
# -----------------------------------------------------------------------------
echo "==> Stopping Docker service"
if systemctl is-active --quiet docker; then
  systemctl stop docker || true
fi
if systemctl is-enabled --quiet docker 2>/dev/null; then
  systemctl disable docker || true
fi
# Also stop containerd (the container runtime) if running.
systemctl stop containerd || true

# -----------------------------------------------------------------------------
# Step 8: Uninstall Docker packages.
# 'apt-get purge' removes the packages AND their configuration files.
# This is more thorough than 'apt-get remove' which keeps config files.
# 'apt-get autoremove' cleans up any dependencies that were only installed
# for Docker and are no longer needed.
# -----------------------------------------------------------------------------
echo "==> Uninstalling Docker packages"
apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin || true
apt-get autoremove -y || true

# -----------------------------------------------------------------------------
# Step 9: Remove Docker's data directories.
# Even after package removal, Docker leaves behind container data, images,
# and volumes in /var/lib/docker and /var/lib/containerd. We remove these
# to fully clean the server.
# -----------------------------------------------------------------------------
echo "==> Removing Docker data directories"
rm -rf /var/lib/docker
rm -rf /var/lib/containerd

# -----------------------------------------------------------------------------
# Step 10: Remove Docker's apt repository and GPG key.
# These were added by server_init_docker.sh during setup. Removing them
# prevents apt from trying to fetch Docker packages in the future.
# -----------------------------------------------------------------------------
echo "==> Removing Docker repository and GPG key"
rm -f /etc/apt/sources.list.d/docker.list
rm -f /etc/apt/keyrings/docker.asc

# -----------------------------------------------------------------------------
# Step 11: Update apt cache.
# After removing the Docker repository, we refresh the package index so
# it no longer references the now-deleted Docker source.
# -----------------------------------------------------------------------------
apt-get update || true

# -----------------------------------------------------------------------------
# Done: Print confirmation.
# -----------------------------------------------------------------------------
echo ""
echo "=========================================="
echo "  TEARDOWN COMPLETE"
echo "=========================================="
echo ""
echo "The following have been removed:"
echo "  ✓ Docker containers, images, and volumes"
echo "  ✓ Application directory ($TARGET_DIR)"
echo "  ✓ Deploy user ($DEPLOY_USER) and home directory"
echo "  ✓ Docker Engine and related packages"
echo "  ✓ Docker apt repository and GPG key"
echo ""
echo "The server has been returned to its original state."
