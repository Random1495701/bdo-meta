#!/usr/bin/env python3
"""Parse skillsimplyoffset.dbss (PABR offset index) and skillsimply.dbss records."""
import struct
import json
from collections import Counter

OFFSET_PATH = '/tmp/skill-extract/skillsimplyoffset.dbss'
DBSS_PATH = '/tmp/skill-extract/skillsimply.dbss'

# ---------- Parse offset file ----------
with open(OFFSET_PATH, 'rb') as f:
    off_data = f.read()

print(f'Offset file size: {len(off_data)} bytes')

count = struct.unpack('<I', off_data[:4])[0]
print(f'Offset count: {count}')

entry_size = 12
print(f'Bytes after header: {len(off_data) - 4}')
print(f'Bytes after header / count = {(len(off_data) - 4)/count}')

offsets = []
lengths = []
markers = []
for i in range(count):
    base = 4 + i * entry_size
    if base + entry_size > len(off_data):
        print(f'  Stopped at i={i}: not enough bytes')
        break
    marker, offset, length = struct.unpack('<III', off_data[base:base + entry_size])
    offsets.append(offset)
    lengths.append(length)
    markers.append(marker)

print(f'Parsed {len(offsets)} entries')
print(f'First 5 entries:')
for i in range(5):
    print(f'  [{i}] marker=0x{markers[i]:08X} offset={offsets[i]} length={lengths[i]}')

print(f'Last 5 entries:')
for i in range(len(offsets)-5, len(offsets)):
    print(f'  [{i}] marker=0x{markers[i]:08X} offset={offsets[i]} length={lengths[i]}')

marker_counts = Counter(markers)
print(f'\nMarker distribution:')
for m, c in marker_counts.most_common():
    print(f'  0x{m:08X}: {c}')

length_counts = Counter(lengths)
print(f'\nLength distribution:')
for l, c in sorted(length_counts.items()):
    print(f'  length={l}: {c}')

print(f'\nSequential offset check (first 5):')
for i in range(5):
    end = offsets[i] + lengths[i]
    next_off = offsets[i+1] if i+1 < len(offsets) else None
    print(f'  [{i}] off={offsets[i]} len={lengths[i]} end={end} next_off={next_off} match={end == next_off}')

with open(DBSS_PATH, 'rb') as f:
    dbss_data = f.read()
dbss_size = len(dbss_data)
print(f'\nDBSS file size: {dbss_size}')
print(f'Last offset ({offsets[-1]}) + last length ({lengths[-1]}) = {offsets[-1] + lengths[-1]}')

# Save offsets/lengths and dbss data path
with open('/tmp/skillsimply_offsets.json', 'w') as f:
    json.dump({'offsets': offsets, 'lengths': lengths, 'markers': [hex(m) for m in markers]}, f)
print('\nSaved /tmp/skillsimply_offsets.json')
