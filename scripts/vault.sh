#!/usr/bin/env bash
# Vault script — commits, tags, and pushes to GitHub
# Usage: ./scripts/vault.sh <version-tag> [commit-message] [--no-push] [--skip-gate]
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

VERSION=""
MSG=""
NO_PUSH=0
SKIP_GATE=0

for arg in "$@"; do
  case "$arg" in
    --no-push) NO_PUSH=1 ;;
    --skip-gate) SKIP_GATE=1 ;;
    --*) ;;
    *)
      if [ -z "$VERSION" ]; then
        VERSION="$arg"
      else
        MSG="$MSG $arg"
      fi
      ;;
  esac
done

if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/vault.sh <version-tag> [commit-message] [--no-push] [--skip-gate]"
  echo "Example: ./scripts/vault.sh v5.2.0 'Add damage calculator'"
  exit 1
fi

MSG="${MSG:-Vault $VERSION}"
echo "=== Vaulting $VERSION ==="
echo "Message: $MSG"

# Pre-vault gate
if [ "$SKIP_GATE" -eq 0 ]; then
  echo "[gate] Running lint..."
  bun run lint || { echo "❌ Lint failed"; exit 1; }
  echo "[gate] ✅ Lint clean"
fi

# Commit all changes
git add -A
if ! git diff --cached --quiet; then
  git commit -m "$MSG"
  echo "✅ Committed"
else
  echo "- Nothing to commit"
fi

# Tag
git tag "$VERSION"
echo "✅ Tagged $VERSION"

# Auto-push
if [ "$NO_PUSH" -eq 0 ]; then
  TOKEN=$(cat ~/.config/bdo-meta/github-token 2>/dev/null || echo "")
  if [ -n "$TOKEN" ]; then
    echo "[push] Pushing to GitHub..."
    git push https://Random1495701:${TOKEN}@github.com/Random1495701/bdo-meta.git main --tags 2>&1 || {
      echo "⚠️ Push failed — token may be expired. Changes are committed locally."
    }
    unset TOKEN
  else
    echo "⚠️ No token at ~/.config/bdo-meta/github-token — skipping push"
    echo "   Push manually: git push origin main --tags"
  fi
fi

# Verify
LATEST=$(git tag | sort -V | tail -1)
echo ""
echo "=== Vault complete ==="
echo "  Version: $VERSION"
echo "  Latest tag: $LATEST"
echo "  HEAD: $(git rev-parse --short HEAD)"
