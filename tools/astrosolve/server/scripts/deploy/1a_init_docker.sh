#!/usr/bin/env bash

# =============================================================================
# 1a_init_docker.sh — Docker Installation Helper
# =============================================================================
# This script installs Docker Engine and the modern Compose plugin on an Ubuntu
# server. It is sourced (not executed) by 1_server_init.sh so that Docker setup
# stays isolated in its own readable file.
#
# Prerequisites: Must be run as root on an Ubuntu server.
# =============================================================================

# sets bash to run in strict mode so that any error fails the script.
# -e: Exit on error. -u: Exit on unset variable. -o pipefail: Fail on pipe errors.
set -euo pipefail

echo "==> Installing Docker and Compose plugin"

# -----------------------------------------------------------------------------
# Step 1: Update the local apt package index so we pull the latest metadata.
# This ensures 'apt-get install' knows about the newest package versions.
# -----------------------------------------------------------------------------
apt-get update

# -----------------------------------------------------------------------------
# Step 2: Install prerequisites required for Docker's repository setup.
#   - ca-certificates: Enables HTTPS certificate verification for secure downloads.
#   - curl: Command-line tool for downloading Docker's GPG key.
#   - gnupg: GNU Privacy Guard, used to verify package authenticity.
# -----------------------------------------------------------------------------
apt-get install -y ca-certificates curl gnupg

# -----------------------------------------------------------------------------
# Step 3: Create the directory for external GPG keyrings.
# Docker's GPG key will be stored here so apt can verify downloaded packages.
# 'install -m 0755' creates the directory with read+execute permissions for all
# users, which is required for apt to access the keyring.
# -----------------------------------------------------------------------------
install -m 0755 -d /etc/apt/keyrings

# -----------------------------------------------------------------------------
# Step 4: Download Docker's official GPG key.
# This key is used to cryptographically verify that Docker packages are
# authentic and have not been tampered with. We skip if already present to
# make re-runs idempotent.
# -----------------------------------------------------------------------------
if [ ! -f /etc/apt/keyrings/docker.asc ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
fi

# Make the key readable by the apt package manager.
chmod a+r /etc/apt/keyrings/docker.asc

# -----------------------------------------------------------------------------
# Step 5: Add Docker's official apt repository.
# This "deb" line tells Ubuntu exactly where to download Docker packages from.
# It auto-detects your CPU architecture (amd64/arm64) and OS version codename
# (e.g. "jammy" for Ubuntu 22.04) so the correct packages are pulled.
# We skip if already present to make re-runs idempotent.
# -----------------------------------------------------------------------------
if [ ! -f /etc/apt/sources.list.d/docker.list ]; then
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" > /etc/apt/sources.list.d/docker.list
fi

# -----------------------------------------------------------------------------
# Step 6: Install Docker Engine and related components.
#   - docker-ce: The Docker daemon (Community Edition).
#   - docker-ce-cli: Command-line interface for interacting with Docker.
#   - containerd.io: The container runtime that Docker uses under the hood.
#   - docker-buildx-plugin: Modern build system for multi-platform images.
#   - docker-compose-plugin: Replaces the old standalone 'docker-compose' binary.
#     Accessed via 'docker compose' (with a space, no hyphen).
# A fresh 'apt-get update' is needed because we just added a new repository.
# -----------------------------------------------------------------------------
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# -----------------------------------------------------------------------------
# Step 7: Enable and start the Docker daemon.
# 'enable' ensures Docker starts automatically on every server reboot.
# 'start' launches it immediately for the current session.
# -----------------------------------------------------------------------------
echo "==> Enabling Docker service"
systemctl enable docker
systemctl start docker

echo "==> Docker installation complete"
