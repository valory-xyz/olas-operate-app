#!/bin/bash
set -e  # Exit on error

# Always run from project root (one level up from script location)
cd "$(dirname "$0")/.."

echo "📁 Running from: $(pwd)"

# Step 1: Get the RC number from user
if [ -z "$1" ]; then
  echo "Usage: ./release.sh <rc-number> (e.g., ./release.sh 3)"
  exit 1
fi

RC_VALUE=$1
VERSION="0.2.0-rc$RC_VALUE"
BRANCH="release/020-rc$RC_VALUE"

echo "🚀 Starting release for version $VERSION"

# Step 2: Check if branch exists locally and delete if not currently checked out
if git show-ref --quiet refs/heads/"$BRANCH"; then
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [ "$CURRENT_BRANCH" = "$BRANCH" ]; then
    echo "❌ Cannot delete the current branch '$BRANCH'. Please checkout another branch first."
    exit 1
  else
    echo "🔁 Deleting existing local branch '$BRANCH'..."
    git branch -D "$BRANCH"
  fi
fi

# Step 3: Create and switch to the new branch
git checkout -b "$BRANCH"

# Step 4: Extract RC number for version fields (strip suffixes like -signed, -ea, -ga)
RC_NUMBER=$(echo "$RC_VALUE" | sed -E 's/^([0-9]+).*/\1/')
VERSION_FIELD="0.2.0-rc$RC_NUMBER"

# Step 5: Update package.json
if [ -f package.json ]; then
  echo "📝 Updating package.json version to $VERSION_FIELD..."
  jq ".version = \"$VERSION_FIELD\"" package.json > tmp_package.json && mv tmp_package.json package.json
else
  echo "❌ package.json not found!"
  exit 1
fi

# Step 6: Update pyproject.toml
if [ -f pyproject.toml ]; then
  echo "📝 Updating pyproject.toml version to $VERSION_FIELD..."
  sed -E "s/^version = \".*\"/version = \"$VERSION_FIELD\"/" pyproject.toml > tmp_pyproject.toml && mv tmp_pyproject.toml pyproject.toml
else
  echo "❌ pyproject.toml not found!"
  exit 1
fi

# Step 7: Commit changes locally
git add package.json pyproject.toml

if git diff --cached --quiet; then
  echo "ℹ️  Nothing to commit. Working tree clean."
else
  git commit -m "chore: release $VERSION"
fi

# Step 8: Delete existing tag if it exists locally and remotely
if git tag | grep -q "v$VERSION"; then
  echo "🔁 Deleting existing local tag 'v$VERSION'..."
  git tag -d "v$VERSION"
fi

if git ls-remote --tags origin | grep -q "refs/tags/v$VERSION"; then
  echo "🔁 Deleting existing remote tag 'v$VERSION'..."
  git push origin --delete "v$VERSION"
fi

# Step 9: Tag the release
git tag "v$VERSION"

# Step 10: Push the tag to remote
git push origin "v$VERSION"

echo "✅ Release $VERSION completed and tagged!"