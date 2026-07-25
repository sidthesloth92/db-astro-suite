#!/bin/sh
# sortronomy installer (macOS / Linux)
#
# Downloads the latest sortronomy release binary for your OS/arch, verifies its
# SHA-256 against the published checksums, and installs it to ~/.local/bin.
# Needs only tools already present on macOS and virtually every Linux: curl (or
# wget), tar, and shasum/sha256sum. Nothing else to install.
#
#   curl -fsSL https://raw.githubusercontent.com/sidthesloth92/db-astro-suite/main/tools/sortronomy/scripts/install.sh | sh
#
# Re-run to upgrade in place. Override the target dir with SORTRONOMY_INSTALL_DIR.
set -eu

REPO="sidthesloth92/db-astro-suite"
COMPONENT="sortronomy"
BINDIR="${SORTRONOMY_INSTALL_DIR:-$HOME/.local/bin}"

err() { printf 'sortronomy: %s\n' "$1" >&2; exit 1; }
info() { printf '%s\n' "$1"; }

# --- pick a downloader (curl or wget) ----------------------------------------
if command -v curl >/dev/null 2>&1; then
  DL="curl -fsSL"; DLO="curl -fsSL -o"
elif command -v wget >/dev/null 2>&1; then
  DL="wget -qO-"; DLO="wget -qO"
else
  err "need curl or wget to download (neither found)."
fi
fetch() { $DL "$1"; }             # URL -> stdout
download() { $DLO "$1" "$2"; }    # dest, URL

# --- OS / arch ---------------------------------------------------------------
os=$(uname -s)
case "$os" in
  Darwin) os=darwin ;;
  Linux) os=linux ;;
  *) err "unsupported OS: $os (macOS/Linux only; on Windows use install.ps1)." ;;
esac
arch=$(uname -m)
case "$arch" in
  x86_64 | amd64) arch=amd64 ;;
  arm64 | aarch64) arch=arm64 ;;
  *) err "unsupported architecture: $arch." ;;
esac

# --- find the newest sortronomy release --------------------------------------
info "Finding the latest $COMPONENT release..."
# The repo is a monorepo, so releases/latest isn't sortronomy-specific. List
# releases (newest first) and take the first tag prefixed with the component.
tag=$(fetch "https://api.github.com/repos/$REPO/releases?per_page=50" \
  | grep '"tag_name"' | grep "\"$COMPONENT-" | head -n 1 \
  | sed -E 's/.*"tag_name":[[:space:]]*"([^"]+)".*/\1/')
[ -n "$tag" ] || err "no published $COMPONENT release found yet."
version=$(printf '%s' "$tag" | sed "s/^$COMPONENT-v//; s/^$COMPONENT-//")

# --- already installed? ------------------------------------------------------
cur=""
existing=$(command -v "$COMPONENT" 2>/dev/null || true)
if [ -n "$existing" ]; then
  cur=$("$existing" --version 2>/dev/null | awk '{print $NF}' || true)
  if [ -n "$cur" ] && [ "$cur" = "$version" ]; then
    info "sortronomy $version is already installed ($existing) — nothing to do."
    exit 0
  fi
fi

# --- download + verify in a temp dir first (atomic) --------------------------
asset="${COMPONENT}_${os}_${arch}.tar.gz"
base="https://github.com/$REPO/releases/download/$tag"
tmp=$(mktemp -d 2>/dev/null || mktemp -d -t sortronomy)
trap 'rm -rf "$tmp"' EXIT INT TERM

info "Downloading $tag ($asset)..."
download "$tmp/$asset" "$base/$asset" || err "download failed: $base/$asset"

if download "$tmp/checksums.txt" "$base/checksums.txt" 2>/dev/null; then
  expected=$(awk -v f="$asset" '$2==f {print $1}' "$tmp/checksums.txt" | head -n 1)
  if [ -n "$expected" ]; then
    if command -v shasum >/dev/null 2>&1; then
      actual=$(shasum -a 256 "$tmp/$asset" | awk '{print $1}')
    elif command -v sha256sum >/dev/null 2>&1; then
      actual=$(sha256sum "$tmp/$asset" | awk '{print $1}')
    else
      actual=""
    fi
    if [ -n "$actual" ] && [ "$actual" != "$expected" ]; then
      err "checksum mismatch for $asset (expected $expected, got $actual)."
    fi
    [ -n "$actual" ] && info "Checksum verified."
  fi
fi

# --- extract -----------------------------------------------------------------
tar -xzf "$tmp/$asset" -C "$tmp" || err "failed to extract $asset."
bin="$tmp/$COMPONENT"
[ -f "$bin" ] || err "archive did not contain a '$COMPONENT' binary."
chmod +x "$bin"
# curl/wget downloads aren't quarantined, but strip it defensively on macOS.
if [ "$os" = "darwin" ]; then xattr -d com.apple.quarantine "$bin" 2>/dev/null || true; fi

# --- install atomically ------------------------------------------------------
mkdir -p "$BINDIR" || err "could not create $BINDIR."
dest="$BINDIR/$COMPONENT"
if ! mv "$bin" "$dest" 2>/dev/null; then
  # $TMPDIR may be a different filesystem than $BINDIR; stage within BINDIR.
  cp "$bin" "$dest.new" && mv "$dest.new" "$dest" || err "could not write $dest (permission?)."
fi
chmod +x "$dest"

if [ -n "$cur" ]; then
  info "Upgraded sortronomy $cur -> $version."
else
  info "Installed sortronomy $version to $dest."
fi

# --- PATH + shadow notes -----------------------------------------------------
case ":$PATH:" in
  *":$BINDIR:"*) ;;
  *)
    info ""
    info "NOTE: $BINDIR is not on your PATH. Add it (then open a new terminal):"
    info "  export PATH=\"$BINDIR:\$PATH\"   # e.g. append to ~/.zshrc or ~/.bashrc"
    ;;
esac
found=$(command -v "$COMPONENT" 2>/dev/null || true)
if [ -n "$found" ] && [ "$found" != "$dest" ]; then
  info ""
  info "NOTE: another '$COMPONENT' on your PATH at $found may shadow $dest."
fi

info "Run 'sortronomy' to get started."
