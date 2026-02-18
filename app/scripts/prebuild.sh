#!/bin/bash
# Prebuild script - copies data from parent directories into app for static export

set -e
cd "$(dirname "$0")/.."

echo "📦 Prebuild: Copying data into app..."

# Create content directories if they don't exist
mkdir -p content/briefings
mkdir -p content/data

# Copy briefing digests
if [ -d "../briefing/digests" ]; then
  cp ../briefing/digests/briefing-*.md content/briefings/ 2>/dev/null || true
  echo "  ✓ Copied briefing digests"
else
  echo "  ⚠ No briefing digests found"
fi

# Copy briefing emails (HTML)
if [ -d "../briefing/emails" ]; then
  mkdir -p content/briefings/html
  cp ../briefing/emails/briefing-*.html content/briefings/html/ 2>/dev/null || true
  echo "  ✓ Copied briefing emails"
fi

# Copy briefing data (jobs, etc)
if [ -d "../briefing/data" ]; then
  mkdir -p content/briefings/data
  cp ../briefing/data/*.json content/briefings/data/ 2>/dev/null || true
  echo "  ✓ Copied briefing data"
fi

# Copy data files
if [ -d "../data" ]; then
  cp ../data/*.json content/data/ 2>/dev/null || true
  echo "  ✓ Copied data files"
fi

# Copy site/data files (vscode-stats, etc)
if [ -d "../site/data" ]; then
  cp ../site/data/*.json content/data/ 2>/dev/null || true
  echo "  ✓ Copied site data files"
fi

echo "📦 Prebuild complete!"
