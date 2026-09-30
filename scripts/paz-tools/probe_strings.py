#!/usr/bin/env python3
"""Probe string boundaries in detail."""
from pathlib import Path
import struct

tt = Path('/home/z/my-project/upload/tooltiptable.dbss').read_bytes()
tt_st = struct.unpack('<Q', tt[-8:])[0]

print('First string boundary (bytes 96855-96890):')
for i in range(96855, 96890, 8):
    chunk = tt[i:i+8]
    print(f'  {i:08x}: {chunk.hex()}  ', ''.join(chr(b) if 32 <= b < 127 else '.' for b in chunk))

print()
print('Second string boundary (bytes 96960-97000):')
for i in range(96960, 97000, 8):
    chunk = tt[i:i+8]
    print(f'  {i:08x}: {chunk.hex()}  ', ''.join(chr(b) if 32 <= b < 127 else '.' for b in chunk))

# Look at first few strings and their boundaries
print()
print('Bytes 96866-96880:')
for i in range(96866, 96880):
    print(f'  byte {i}: 0x{tt[i]:02x}')

# Parse with original approach
pos = tt_st + 9
strings = []
while pos < len(tt) - 8:
    null_pos = tt.find(b'\x00\x00', pos)
    if null_pos < 0 or null_pos > len(tt) - 8: break
    text = tt[pos:null_pos].decode('utf-16-le', errors='replace')
    strings.append((pos, null_pos, text))
    next_pos = null_pos + 2
    if next_pos < len(tt) and tt[next_pos] in [0, 1, 2, 3]:
        next_pos += 1
    pos = next_pos

print(f'\nParsed {len(strings)} strings')
even_count = sum(1 for s, e, _ in strings if (e - s) % 2 == 0)
odd_count = sum(1 for s, e, _ in strings if (e - s) % 2 == 1)
print(f'Even byte count: {even_count}, Odd byte count: {odd_count}')

# Check distribution of bytes between strings (separator lengths)
sep_counts = {}
for i in range(len(strings) - 1):
    end_this = strings[i][1]
    start_next = strings[i + 1][0]
    sep_len = start_next - end_this
    sep_counts[sep_len] = sep_counts.get(sep_len, 0) + 1

print(f'\nSeparator length distribution (bytes between null pair and next string start):')
for sl, cnt in sorted(sep_counts.items()):
    print(f'  sep_len={sl}: {cnt} strings')

# Look at the first 5 strings and their text
print(f'\nFirst 5 strings:')
for i, (s, e, t) in enumerate(strings[:5]):
    print(f'  [{i}] pos={s}-{e} ({e-s} bytes): {t!r}')

# Find PVP templates
pvp_strings = [(i, s, e, t) for i, (s, e, t) in enumerate(strings) if 'PVP' in t.upper() and '피해 적용' in t]
print(f'\nPVP templates found: {len(pvp_strings)}')
for i, s, e, t in pvp_strings[:5]:
    print(f'  str_id={i} pos={s}-{e}: {t!r}')
