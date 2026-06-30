#!/bin/bash
mkdir -p public/icons/portraits

declare -A NAMES
NAMES[cor Corsair]="corsair:Corsair"
NAMES[deadeye]="deadeye:Deadeye"
NAMES[dosa]="dosa:Dosa"
NAMES[drakania]="drakania:Drakania"
NAMES[guardian]="guardian:Guardian"
NAMES[hashashin]="hashashin:Hashashin"
NAMES[maegu]="maegu:Maegu"
NAMES[nova]="nova:Nova"
NAMES[sage]="sage:Sage"
NAMES[scholar]="scholar:Scholar"
NAMES[seraph]="seraph:Seraph"
NAMES[shai]="shai:Shai"
NAMES[woosa]="woosa:Woosa"
NAMES[wukong]="wukong:Wukong"

MISSING="corsair deadeye dosa drakania guardian hashashin maegu nova sage scholar seraph shai woosa wukong"

for SLUG in $MISSING; do
  case $SLUG in
    corsair) NAME="Corsair";;
    deadeye) NAME="Deadeye";;
    dosa) NAME="Dosa";;
    drakania) NAME="Drakania";;
    guardian) NAME="Guardian";;
    hashashin) NAME="Hashashin";;
    maegu) NAME="Maegu";;
    nova) NAME="Nova";;
    sage) NAME="Sage";;
    scholar) NAME="Scholar";;
    seraph) NAME="Seraph";;
    shai) NAME="Shai";;
    woosa) NAME="Woosa";;
    wukong) NAME="Wukong";;
  esac
  OUTFILE="public/icons/portraits/${SLUG}.png"
  echo -n "$NAME... "
  RESULT=$(z-ai image-search -q "Black Desert Online $NAME class character art" -c 1 --gl us --no-rank 2>/dev/null | sed -n '/^{/,$ p')
  URL=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['results'][0]['original_url'] if d.get('results') else '')" 2>/dev/null)
  if [ -z "$URL" ]; then echo "✗ no result"; continue; fi
  curl -s -L -o "$OUTFILE" "$URL"
  SIZE=$(stat -c%s "$OUTFILE" 2>/dev/null || echo 0)
  if [ "$SIZE" -gt 1000 ]; then echo "✓ ${SIZE}b"; else echo "✗ small"; rm -f "$OUTFILE"; fi
  sleep 1
done
echo "Total: $(ls public/icons/portraits/*.png 2>/dev/null | wc -l)"
