#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "=== BDO Meta Health Check ==="
PASS=0
FAIL=0

# 1. Git working tree clean
if git diff --quiet && git diff --cached --quiet; then
  echo "✅ Git working tree clean"
  PASS=$((PASS+1))
else
  echo "❌ Git working tree dirty"
  FAIL=$((FAIL+1))
fi

# 2. .env not tracked
if git ls-files --error-unmatch .env 2>/dev/null; then
  echo "❌ .env is TRACKED"
  FAIL=$((FAIL+1))
else
  echo "✅ .env not tracked"
  PASS=$((PASS+1))
fi

# 3. output: "standalone" present
if grep -q 'output.*standalone' next.config.ts 2>/dev/null; then
  echo "✅ output: standalone present"
  PASS=$((PASS+1))
else
  echo "❌ output: standalone MISSING"
  FAIL=$((FAIL+1))
fi

# 4. Build script has cp commands
if grep '"build"' package.json | grep -q 'cp -r .next/static' 2>/dev/null; then
  echo "✅ Build script has cp commands"
  PASS=$((PASS+1))
else
  echo "❌ Build script missing cp commands"
  FAIL=$((FAIL+1))
fi

# 5. db/custom.db exists
if [ -f db/custom.db ]; then
  echo "✅ db/custom.db exists ($(du -h db/custom.db | cut -f1))"
  PASS=$((PASS+1))
else
  echo "❌ db/custom.db MISSING"
  FAIL=$((FAIL+1))
fi

# 6. Dev server running
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 3 2>/dev/null | grep -q "200"; then
  echo "✅ Dev server running"
  PASS=$((PASS+1))
else
  echo "❌ Dev server not running"
  FAIL=$((FAIL+1))
fi

# 7. Lint clean
if bun run lint 2>/dev/null; then
  echo "✅ Lint clean"
  PASS=$((PASS+1))
else
  echo "❌ Lint errors"
  FAIL=$((FAIL+1))
fi

# 8. Skills in DB
SKILL_COUNT=$(bun -e "const {db}=require('./src/lib/db');db.skill.count().then(c=>console.log(c))" 2>/dev/null || echo "0")
if [ "$SKILL_COUNT" -gt 100 ]; then
  echo "✅ DB has $SKILL_COUNT skills"
  PASS=$((PASS+1))
else
  echo "❌ DB has only $SKILL_COUNT skills (need restore)"
  FAIL=$((FAIL+1))
fi

# 9. Latest tag matches HEAD
LATEST=$(git tag | sort -V | tail -1)
HEAD_SHA=$(git rev-parse --short HEAD)
TAG_SHA=$(git rev-parse --short "$LATEST" 2>/dev/null || echo "none")
if [ "$HEAD_SHA" = "$TAG_SHA" ]; then
  echo "✅ HEAD matches latest tag ($LATEST)"
  PASS=$((PASS+1))
else
  echo "⚠️ HEAD ($HEAD_SHA) != latest tag ($LATEST = $TAG_SHA) — may have uncommitted work"
  PASS=$((PASS+1))  # Not a hard fail, just a warning
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
