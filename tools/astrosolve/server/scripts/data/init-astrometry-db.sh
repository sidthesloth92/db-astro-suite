#!/bin/bash

set -euo pipefail

# Allow callers to target a different directory, but default to the local dev cache.
TARGET_DIR="${1:-data/astrometry}"

mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

# These two index families cover the field sizes currently needed by Astrosolve.
# Download 4100 series (Tycho-2) - Scales 07 to 19 (whole-sky single files, good for wide field).
# Note: the 4100 series only publishes whole-sky files starting at scale 07;
# scales below 07 do not exist for this series.
for i in {4107..4119}; do
  file="index-${i}.fits"
  if [ ! -f "$file" ]; then
    echo "Downloading $file..."
    curl -fO "http://data.astrometry.net/4100/$file"
  else
    echo "Skipping $file, already exists."
  fi
done

# 2MASS adds deeper matching support for smaller and dimmer fields.
# Download 4200 series (2MASS) - Scales 08 to 19 as whole-sky single files.
for i in {4208..4219}; do
  file="index-${i}.fits"
  if [ ! -f "$file" ]; then
    echo "Downloading $file..."
    curl -fO "http://data.astrometry.net/4200/$file"
  else
    echo "Skipping $file, already exists."
  fi
done

# 2MASS scales 06 and 07 are split into 12 healpix tiles each (whole-sky coverage
# when combined). These are required for fields narrower than ~1 degree.
# Scale 07 quads: ~11-28 arcmin — useful for 0.4°+ fields.
# Scale 06 quads: ~8-20 arcmin — reliable for fields as small as ~0.3°.
for scale in 4207 4206; do
  for i in $(seq 0 11); do
    tile=$(printf '%02d' "$i")
    file="index-${scale}-${tile}.fits"
    if [ ! -f "$file" ]; then
      echo "Downloading $file..."
      curl -fO "http://data.astrometry.net/4200/$file"
    else
      echo "Skipping $file, already exists."
    fi
  done
done

echo "All Astrometry.net index files downloaded!"
