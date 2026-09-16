#!/usr/bin/env python3
"""
Walk tooltiptable.dbss using offset index — decode variable-length records.
Properly parses the PABR offset index (16-byte rows of two hash+offset pairs).
"""
import struct, json
from pathlib import Path
from collections import Counter

TT_PATH = '/home/z/my-project/upload/tooltiptable.dbss'
TT_OFF_PATH = '/home/z/my-project/upload/tooltiptableoffset.dbss'

def hex_dump(data, start=0, length=128):
    out = []
    for i in range(0, min(len(data), length), 16):
        chunk = data[i:i+16]
        hex_part = ' '.join(f'{b:02x}' for b in chunk)
        ascii_part = ''.join(chr(b) if 32 <= b < 127 else '.' for b in chunk)
        out.append(f'  {start+i:08x}: {hex_part:<48} {ascii_part}')
    return '\n'.join(out)

def main():
    tt = Path(TT_PATH).read_bytes()
    tt_off = Path(TT_OFF_PATH).read_bytes()
    print(f'tooltiptable.dbss size: {len(tt):,} bytes')
    print(f'tooltiptableoffset.dbss size: {len(tt_off):,} bytes')
    print()
    print('--- tooltiptableoffset.dbss header (first 64 bytes) ---')
    print(hex_dump(tt_off, 0, 64))
    print()
    print('--- tooltiptableoffset.dbss footer (last 16 bytes) ---')
    print(hex_dump(tt_off[-16:], len(tt_off)-16, 16))
    print()

    # PABR header: magic(4) + count(u32) = 8 bytes
    # Body: 16-byte rows × N
    # Footer: u64 start_pos at last 8 bytes
    magic = tt_off[:4]
    count = struct.unpack('<I', tt_off[4:8])[0]
    sep_byte = tt_off[8]  # First body byte
    start_pos = struct.unpack('<Q', tt_off[-8:])[0]
    print(f'magic={magic}, count={count}, body[0]=0x{sep_byte:02x}, start_pos={start_pos}')
    
    # Existing extractor: rows = (start_pos - 8) // 16
    rows = (start_pos - 8) // 16
    print(f'rows (start_pos-8)/16 = {rows}')
    
    # Read all (hash, offset) pairs
    hash_to_offset = {}
    all_pairs = []
    for i in range(rows):
        base = 8 + i * 16
        a, b, c, d = struct.unpack('<IIII', tt_off[base:base+16])
        all_pairs.append((a, b, c, d))
    
    # In tt.dbss, the body ends at tt_st (start_pos of tt.dbss footer)
    tt_st = struct.unpack('<Q', tt[-8:])[0]
    print(f'tt.dbss start_pos (body ends at) = {tt_st}')
    
    valid_pairs = 0
    for a, b, c, d in all_pairs:
        if 8 <= b < tt_st:
            hash_to_offset[a] = b
            valid_pairs += 1
        if 8 <= d < tt_st:
            hash_to_offset[c] = d
            valid_pairs += 1
    print(f'valid (hash,offset) pairs (where 8<=offset<tt_st): {valid_pairs}')
    print(f'unique hashes pointing into tt body: {len(hash_to_offset)}')
    
    # Sort offsets and compute record lengths
    sorted_offs = sorted(hash_to_offset.values())
    print(f'\nunique sorted record offsets: {len(sorted_offs)}')
    print(f'  min offset: {sorted_offs[0]}')
    print(f'  max offset: {sorted_offs[-1]}')
    
    lengths = []
    for i, off in enumerate(sorted_offs):
        if i + 1 < len(sorted_offs):
            length = sorted_offs[i+1] - off
        else:
            length = tt_st - off  # last record ends at start of index/footer
        lengths.append(length)
    length_counter = Counter(lengths)
    print(f'\n  Record length distribution:')
    for ln, cnt in sorted(length_counter.items()):
        print(f'    {ln:4d} bytes: {cnt} records')
    print(f'\n  min={min(lengths)} max={max(lengths)} avg={sum(lengths)/len(lengths):.1f}')
    mode = length_counter.most_common(1)[0]
    print(f'  mode={mode[0]} (count={mode[1]})')
    print(f'  unique lengths: {len(length_counter)}')
    
    # Save (hash, offset, length) tuples
    records = []
    for h, off in hash_to_offset.items():
        idx = sorted_offs.index(off)
        length = lengths[idx]
        records.append({'hash': h, 'offset': off, 'length': length})
    
    # Sort by offset for convenience
    records.sort(key=lambda r: r['offset'])
    
    import json
    Path('/tmp/tt_offsets.json').write_text(json.dumps({
        'count': len(records),
        'records': records,
        'tt_st': tt_st,
    }))
    print(f'\n  Saved {len(records)} records to /tmp/tt_offsets.json')
    
    # Hex-dump first 5 records
    print(f'\n--- First 5 records (variable length) ---')
    for r in records[:5]:
        off = r['offset']
        length = r['length']
        rec = tt[off:off+length]
        print(f'\nRecord hash=0x{r["hash"]:08x} offset={off} length={length}')
        print(hex_dump(rec, off, min(length, 128)))

if __name__ == '__main__':
    main()
