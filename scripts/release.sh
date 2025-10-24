#!/bin/bash
set -e  # Exit on error

# This script is designed to run only in GitHub Actions
# It updates version files and creates tags for releases

# Always run from project root (one level up from script location)
cd "$(dirname "$0")/.."

echo "📁 Running from: $(pwd)"

# Validate we're in GitHub Actions
if [ -z "$GITHUB_ACTIONS" ]; then
  echo "❌ This script is designed to run only in GitHub Actions"
  echo "   For local development, use the manual release process"
  exit 1
fi

echo "🤖 Running in GitHub Actions context"

# Step 1: Get the RC number from environment variable
if [ -z "$RC_VALUE" ]; then
  echo "❌ RC_VALUE environment variable is required"
  exit 1
fi

RC_VALUE=$RC_VALUE
VERSION="0.2.0-rc$RC_VALUE"

echo "🚀 Starting release for version $VERSION"

# Step 2: Extract RC number for version fields (strip suffixes like -signed, -ea, -ga)
RC_NUMBER=$(echo "$RC_VALUE" | sed -E 's/^([0-9]+).*/\1/')
VERSION_FIELD="0.2.0-rc$RC_NUMBER"

# Validate RC number is numeric
if ! [[ "$RC_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "❌ Invalid RC number: $RC_NUMBER. Must be a positive integer."
  exit 1
fi

echo "📋 Release details:"
echo "   RC Value: $RC_VALUE"
echo "   RC Number: $RC_NUMBER"
echo "   Version: $VERSION"
echo "   Version Field: $VERSION_FIELD"

# Step 3: Update package.json
if [ -f package.json ]; then
  echo "📝 Updating package.json version to $VERSION_FIELD..."
  jq ".version = \"$VERSION_FIELD\"" package.json > tmp.json && mv tmp.json package.json
  echo "✅ Updated package.json"
else
  echo "❌ package.json not found!"
  exit 1
fi

# Step 4: Update pyproject.toml
if [ -f pyproject.toml ]; then
  echo "📝 Updating pyproject.toml version to $VERSION_FIELD..."
  sed -i "s/^version = \".*\"/version = \"$VERSION_FIELD\"/" pyproject.toml
  echo "✅ Updated pyproject.toml"
else
  echo "❌ pyproject.toml not found!"
  exit 1
fi

# Step 5: Commit changes to current branch
echo "📝 Committing version updates to current branch..."
git add package.json pyproject.toml

if git diff --cached --quiet; then
  echo "ℹ️  Nothing to commit. Version files are already up to date."
else
  git commit -m "chore: release $VERSION"
  echo "✅ Committed version updates for $VERSION"
fi

# Step 6: Delete existing tag if it exists locally and remotely
if git tag | grep -q "v$VERSION"; then
  echo "🔁 Deleting existing local tag 'v$VERSION'..."
  git tag -d "v$VERSION"
fi

if git ls-remote --tags origin | grep -q "refs/tags/v$VERSION"; then
  echo "🔁 Deleting existing remote tag 'v$VERSION'..."
  git push origin --delete "v$VERSION"
fi

# Step 7: Tag the release
echo "🏷️  Creating tag v$VERSION..."
git tag "v$VERSION"

# Step 8: Push the tag to remote
echo "📤 Pushing tag to remote..."
git push origin "v$VERSION"

echo "✅ Release $VERSION completed and tagged!"
echo ""
echo "📋 Summary:"
echo "   Version: $VERSION"
echo "   Tag: v$VERSION"
echo "   Files updated: package.json, pyproject.toml"
echo "   Committed to: $(git rev-parse --abbrev-ref HEAD)"
echo ""
echo "🚀 The tag has been pushed and should trigger the release workflow."
echo "   Monitor the build progress in your CI/CD system."