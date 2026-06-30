#!/bin/bash
mkdir -p public/icons/portraits

CLASSES=(
  "warrior:Warrior"
  "ranger:Ranger"
  "sorceress:Sorceress"
  "berserker:Berserker"
  "tamer:Tamer"
  "valkyrie:Valkyrie"
  "wizard:Wizard"
  "witch:Witch"
  "musa:Musa"
  "maehwa:Maehwa"
  "lahn:Lahn"
  "striker:Striker"
  "mystic:Mystic"
  "kunoichi:Kunoichi"
  "ninja:Ninja"
  "dark-knight:Dark Knight"
  "archer:Archer"
  "shai:Shai"
  "guardian:Guardian"
  "hashashin:Hashashin"
  "nova:Nova"
  "sage:Sage"
  "corsair:Corsair"
  "drakania:Drakania"
  "woosa:Woosa"
  "maegu:Maegu"
  "scholar:Scholar"
  "dosa:Dosa"
  "seraph:Seraph"
  "deadeye:Deadeye"
  "wukong:Wukong"
)

for entry in "${CLASSES[@]}"; do
  SLUG="${entry%%:*}"
  NAME="${entry##*:}"
  OUTFILE="public/icons/portraits/${SLUG}.png"
  
  if [ -f "$OUTFILE" ] && [ $(stat -c%s "$OUTFILE" 2>/dev/null || echo 0) -gt 1000 ]; then
    echo "✓ $NAME (exists)"
    continue
  fi
  
  echo -n "$NAME... "
  # Search — extract only the JSON part (skip emoji lines)
  RESULT=$(z-ai image-search -q "Black Desert Online $NAME class character portrait" -c 1 --gl us --no-rank 2>/dev/null | sed -n '/^{/,$ p')
  URL=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['results'][0]['original_url'] if d.get('results') else '')" 2>/dev/null)
  
  if [ -z "$URL" ]; then
    echo "✗ no result"
    continue
  fi
  
  curl -s -L -o "$OUTFILE" "$URL"
  SIZE=$(stat -c%s "$OUTFILE" 2>/dev/null || echo 0)
  
  if [ "$SIZE" -gt 1000 ]; then
    echo "✓ ${SIZE}b"
  else
    echo "✗ too small"
    rm -f "$OUTFILE"
  fi
  sleep 1
done

echo ""
echo "Total: $(ls public/icons/portraits/*.png 2>/dev/null | wc -l) portraits"
