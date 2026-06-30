#!/bin/bash
mkdir -p public/icons/portraits/specs

# classType mapping (from BDO official site)
# 0=Warrior, 1=Ranger, 2=Berserker, 3=Sorceress, 4=Tamer, 5=Valkyrie, 6=Wizard, 7=Witch
# 8=Musa, 9=Maehwa, 10=Kunoichi, 11=Ninja, 12=Dark Knight, 13=Striker, 14=Mystic
# 15=Lahn, 16=Archer, 17=Shai, 18=Guardian, 19=Hashashin, 20=Nova, 21=Sage
# 22=Corsair, 23=Drakania, 24=Woosa, 25=Maegu, 26=Scholar, 27=Dosa, 28=Seraph
# 29=Deadeye, 30=Wukong, 31=Starful, 32=Dosa2, 33=...
# Note: some classTypes may differ from our classIds

# Map: slug:classType
declare -A CLASS_TYPES
CLASS_TYPES[warrior]=0
CLASS_TYPES[ranger]=1
CLASS_TYPES[berserker]=2
CLASS_TYPES[sorceress]=3
CLASS_TYPES[tamer]=4
CLASS_TYPES[valkyrie]=5
CLASS_TYPES[wizard]=6
CLASS_TYPES[witch]=7
CLASS_TYPES[musa]=8
CLASS_TYPES[maehwa]=9
CLASS_TYPES[kunoichi]=10
CLASS_TYPES[ninja]=11
CLASS_TYPES[dark-knight]=12
CLASS_TYPES[striker]=13
CLASS_TYPES[mystic]=14
CLASS_TYPES[lahn]=15
CLASS_TYPES[archer]=16
CLASS_TYPES[shai]=17
CLASS_TYPES[guardian]=18
CLASS_TYPES[hashashin]=19
CLASS_TYPES[nova]=20
CLASS_TYPES[sage]=21
CLASS_TYPES[corsair]=22
CLASS_TYPES[drakania]=23
CLASS_TYPES[woosa]=24
CLASS_TYPES[maegu]=25
CLASS_TYPES[scholar]=26
CLASS_TYPES[dosa]=27
CLASS_TYPES[seraph]=28
CLASS_TYPES[deadeye]=29
CLASS_TYPES[wukong]=30

BASE="https://static.pearlcdn.com/asset/portal/bdo_naeu/contents/img/portal/gameinfo"

for SLUG in "${!CLASS_TYPES[@]}"; do
  CT=${CLASS_TYPES[$SLUG]}
  
  # Main class portrait
  MAIN_FILE="public/icons/portraits/${SLUG}.jpg"
  if [ ! -f "$MAIN_FILE" ]; then
    curl -s -o "$MAIN_FILE" "${BASE}/class${CT}_img_1.jpg"
    SIZE=$(stat -c%s "$MAIN_FILE" 2>/dev/null || echo 0)
    if [ "$SIZE" -gt 1000 ]; then
      echo "✓ $SLUG main: ${SIZE}b"
    else
      rm -f "$MAIN_FILE"
      echo "✗ $SLUG main: no image"
    fi
  fi
  
  # Awakening portrait
  AWK_FILE="public/icons/portraits/specs/${SLUG}-awakening.jpg"
  if [ ! -f "$AWK_FILE" ]; then
    curl -s -o "$AWK_FILE" "${BASE}/class${CT}_awaken_img_1.jpg"
    SIZE=$(stat -c%s "$AWK_FILE" 2>/dev/null || echo 0)
    if [ "$SIZE" -gt 1000 ]; then
      echo "✓ $SLUG awakening: ${SIZE}b"
    else
      rm -f "$AWK_FILE"
      echo "✗ $SLUG awakening: no image"
    fi
  fi
  
  # Succession portrait
  SUCC_FILE="public/icons/portraits/specs/${SLUG}-succession.jpg"
  if [ ! -f "$SUCC_FILE" ]; then
    curl -s -o "$SUCC_FILE" "${BASE}/class${CT}_succession_img_1.jpg"
    SIZE=$(stat -c%s "$SUCC_FILE" 2>/dev/null || echo 0)
    if [ "$SIZE" -gt 1000 ]; then
      echo "✓ $SLUG succession: ${SIZE}b"
    else
      rm -f "$SUCC_FILE"
      echo "✗ $SLUG succession: no image"
    fi
  fi
done

echo ""
echo "=== Summary ==="
echo "Main portraits: $(ls public/icons/portraits/*.jpg 2>/dev/null | wc -l)"
echo "Awakening portraits: $(ls public/icons/portraits/specs/*-awakening.jpg 2>/dev/null | wc -l)"
echo "Succession portraits: $(ls public/icons/portraits/specs/*-succession.jpg 2>/dev/null | wc -l)"
