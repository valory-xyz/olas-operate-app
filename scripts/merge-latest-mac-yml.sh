#!/bin/bash
# Merge two arch-specific latest-mac.yml files into one.
#
# electron-builder generates latest-mac.yml per build. When arm64 and x64
# are built on separate CI runners, the second upload overwrites the first.
# This script merges both into a single file with entries for all architectures.
#
# Usage: ./merge-latest-mac-yml.sh <arm64_yml> <x64_yml> <output>

set -euo pipefail

ARM64_YML="$1"
X64_YML="$2"
OUTPUT="$3"

if [ ! -f "$ARM64_YML" ] && [ ! -f "$X64_YML" ]; then
  echo "ERROR: No yml files found" >&2
  exit 1
fi

# Strip releaseNotes so electron-updater reads them from GitHub Atom feed instead
strip_release_notes() {
  sed '/^releaseNotes:/,/^[a-zA-Z]/{ /^releaseNotes:/d; /^[a-zA-Z]/!d; }' "$1"
}

# If only one exists, use it directly (strip releaseNotes)
if [ ! -f "$ARM64_YML" ]; then
  strip_release_notes "$X64_YML" > "$OUTPUT"
  echo "Only x64 yml found, using as-is"
  exit 0
fi
if [ ! -f "$X64_YML" ]; then
  strip_release_notes "$ARM64_YML" > "$OUTPUT"
  echo "Only arm64 yml found, using as-is"
  exit 0
fi

# Extract version and releaseDate from arm64 (arbitrary choice)
VERSION=$(grep '^version:' "$ARM64_YML" | head -1 | sed 's/version: //')
RELEASE_DATE=$(grep '^releaseDate:' "$ARM64_YML" | head -1 | sed "s/releaseDate: //")

# Extract file entries (lines starting with "  -" or "    " after "files:")
extract_files() {
  awk '/^files:/{found=1; next} found && /^[a-zA-Z]/{found=0} found{print}' "$1"
}

ARM64_FILES=$(extract_files "$ARM64_YML")
X64_FILES=$(extract_files "$X64_YML")

# Get arm64 zip entry for the default path/sha512
ARM64_PATH=$(awk '/url:.*arm64.*\.zip/{gsub(/.*url: /,""); print; exit}' "$ARM64_YML")
ARM64_SHA=$(awk '/url:.*arm64.*\.zip/{found=1; next} found && /sha512:/{gsub(/.*sha512: /,""); print; exit}' "$ARM64_YML")

cat > "$OUTPUT" << YAML
version: ${VERSION}
files:
${ARM64_FILES}
${X64_FILES}
path: ${ARM64_PATH}
sha512: ${ARM64_SHA}
releaseDate: ${RELEASE_DATE}
YAML

echo "Merged latest-mac.yml:"
cat "$OUTPUT"
