#!/bin/bash
mkdir -p astrometry_data
cd astrometry_data

# Download 4100 series (Tycho-2) - Scales 07 to 19 (good for wide field)
for i in {4107..4119}; do
  file="index-${i}.fits"
  if [ ! -f "$file" ]; then
    echo "Downloading $file..."
    curl -O "http://data.astrometry.net/4100/$file"
  else
    echo "Skipping $file, already exists."
  fi
done

# Download 4200 series (2MASS) - Scales 08 to 19 (additional depth)
for i in {4208..4219}; do
  file="index-${i}.fits"
  if [ ! -f "$file" ]; then
    echo "Downloading $file..."
    curl -O "http://data.astrometry.net/4200/$file"
  else
    echo "Skipping $file, already exists."
  fi
done
echo "All Astrometry.net index files downloaded!"
