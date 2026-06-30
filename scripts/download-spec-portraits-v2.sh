#!/bin/bash
mkdir -p public/icons/portraits/specs

# Correct classType mapping from official BDO site
declare -A CT
CT[warrior]=0
CT[ranger]=4
CT[sorceress]=8
CT[berserker]=12
CT[tamer]=16
CT[musa]=20
CT[maehwa]=21
CT[valkyrie]=24
CT[kunoichi]=25
CT[ninja]=26
CT[wizard]=28
CT[witch]=31
CT[striker]=19
CT[mystic]=23
CT[lahn]=11
CT[archer]=29
CT[dark-knight]=27
CT[shai]=17
CT[guardian]=5
CT[hashashin]=1
CT[nova]=9
CT[sage]=2
CT[corsair]=10
CT[drakania]=7
CT[woosa]=30
CT[maegu]=15
CT[scholar]=6
CT[dosa]=33
CT[deadeye]=34
CT[wukong]=3
CT[seraph]=32

BASE="https://static.pearlcdn.com/asset/portal/bdo_naeu/contents/img/portal/gameinfo"

MAIN_COUNT=0
AWK_COUNT=0
SUCC_COUNT=0

for SLUG in "${!CT[@]}"; do
  CTYPE=${CT[$SLUG]}
  
  # Main portrait
  MAIN_FILE="public/icons/portraits/${SLUG}.jpg"
  curl -s -o "$MAIN_FILE" "${BASE}/class${CTYPE}_img_1.jpg"
  SIZE=$(stat -c%s "$MAIN_FILE" 2>/dev/null || echo 0)
  if [ "$SIZE" -gt 1000 ]; then
    MAIN_COUNT=$((MAIN_COUNT+1))
  else
    rm -f "$MAIN_FILE"
  fi
  
  # Awakening portrait
  AWK_FILE="public/icons/portraits/specs/${SLUG}-awakening.jpg"
  curl -s -o "$AWK_FILE" "${BASE}/class${CTYPE}_awaken_img_1.jpg"
  SIZE=$(stat -c%s "$AWK_FILE" 2>/dev/null || echo 0)
  if [ "$SIZE" -gt 1000 ]; then
    AWK_COUNT=$((AWK_COUNT+1))
  else
    rm -f "$AWK_FILE"
  fi
  
  # Succession portrait
  SUCC_FILE="public/icons/portraits/specs/${SLUG}-succession.jpg"
  curl -s -o "$SUCC_FILE" "${BASE}/class${CTYPE}_succession_img_1.jpg"
  SIZE=$(stat -c%s "$SUCC_FILE" 2>/dev/null || echo 0)
  if [ "$SIZE" -gt 1000 ]; then
    SUCC_COUNT=$((SUCC_COUNT+1))
  else
    rm -f "$SUCC_FILE"
  fi
done

echo "Main portraits: $MAIN_COUNT / 31"
echo "Awakening portraits: $AWK_COUNT / 31"
echo "Succession portraits: $SUCC_COUNT / 31"
