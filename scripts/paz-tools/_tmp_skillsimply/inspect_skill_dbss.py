#!/usr/bin/env python3
"""Quick inspection of skill.dbss structure."""
import struct
from collections import Counter

with open('/tmp/skill-extract/skilloffset.dbss', 'rb') as f:
    data = f.read()
print('skilloffset.dbss size:', len(data))
print('First 4 bytes u32 LE:', struct.unpack('<I', data[:4])[0])

count = struct.unpack('<I', data[:4])[0]
print('Count:', count)

# Parse first 10 offset entries
offsets = []
lengths = []
markers = []
entry_size = 12
for i in range(min(count, 10)):
    base = 4 + i * entry_size
    marker, off, ln = struct.unpack('<III', data[base:base+entry_size])
    offsets.append(off)
    lengths.append(ln)
    markers.append(marker)
    print(f'  [{i}] marker=0x{marker:08X} offset={off} length={ln}')

# Length distribution
ldist = Counter()
for i in range(count):
    base = 4 + i * entry_size
    if base + entry_size > len(data):
        break
    _, _, ln = struct.unpack('<III', data[base:base+entry_size])
    ldist[ln] += 1
print(f'Length distribution:')
for l, c in sorted(ldist.items())[:20]:
    print(f'  length={l}: {c}')

# Load skill.dbss and show first 3 records
with open('/tmp/skill-extract/skill.dbss', 'rb') as f:
    raw = f.read()
print(f'\nskill.dbss size: {len(raw)}')

for i in range(min(5, len(offsets))):
    off = offsets[i]
    ln = lengths[i]
    rec = raw[off:off+ln]
    print(f'\nRecord {i}: offset={off} length={ln}')
    # First 80 bytes hex
    for j in range(0, min(ln, 80), 16):
        chunk = rec[j:j+16]
        hex_str = ' '.join(f'{c:02x}' for c in chunk)
        ascii_str = ''.join(chr(c) if 32 <= c < 127 else '.' for c in chunk)
        print(f'  {j:3d}: {hex_str:<48} {ascii_str}')
    # First u32 = SkillKey
    sk = struct.unpack('<I', rec[:4])[0]
    print(f'  SkillKey u32 LE: 0x{sk:08X} ({sk})')
