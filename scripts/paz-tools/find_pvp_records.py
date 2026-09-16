#!/usr/bin/env python3
"""
Find PVP-template records in tooltiptable.dbss and hex-dump their bytes
to identify the {p0} parameter byte position.
"""
import struct, json, re
from pathlib import Path
from collections import Counter, defaultdict

TT_PATH = '/home/z/my-project/upload/tooltiptable.dbss'
TT_OFF_PATH = '/home/z/my-project/upload/tooltiptableoffset.dbss'

def parse_pabr_strings(data, start):
    count = struct.unpack('<I', data[start:start+4])[0]
    sep = data[start+4]
    pos = start + 5
    strings = []
    for i in range(count):
        if pos + 4 > len(data): break
        byte_len = struct.unpack('<I', data[pos:pos+4])[0]
        pos += 4
        if pos + byte_len > len(data): break
        text_bytes = data[pos:pos+byte_len]
        pos += byte_len
        if pos < len(data) and data[pos] == sep:
            pos += 1
        try:
            text = text_bytes.decode('utf-16-le', errors='replace')
        except:
            text = ''
        strings.append({'idx': i, 'text': text})
    return strings

def parse_offset_index(tt_off, tt_st):
    """PABR offset index format:
    [4 bytes magic PABR][u32 count] = 8-byte header
    Then count × 16-byte rows. Each row has 4 u32s, parsed as TWO (hash, offset) pairs.
    Filter: only valid offsets (8 ≤ offset < tt_st).
    """
    start_pos = struct.unpack('<Q', tt_off[-8:])[0]
    rows = (start_pos - 8) // 16
    hash_to_offset = {}
    for i in range(rows):
        base = 8 + i * 16
        a, b, c, d = struct.unpack('<IIII', tt_off[base:base+16])
        if 8 <= b < tt_st:
            hash_to_offset[a] = b
        if 8 <= d < tt_st:
            hash_to_offset[c] = d
    return hash_to_offset

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
    tt_st = struct.unpack('<Q', tt[-8:])[0]
    
    # Parse strings
    strings = parse_pabr_strings(tt, tt_st)
    print(f'Parsed {len(strings)} PABR strings')
    
    # Find PVP template str_ids
    pvp_str_ids = set()
    for s in strings:
        if 'PVP' in s['text'].upper() and '피해 적용' in s['text']:
            pvp_str_ids.add(s['idx'])
    print(f'PVP template str_ids: {len(pvp_str_ids)}')
    
    # Parse offset index
    hash_to_offset = parse_offset_index(tt_off, tt_st)
    print(f'Hash→offset entries: {len(hash_to_offset)}')
    
    # Compute record lengths
    sorted_offs = sorted(hash_to_offset.values())
    off_to_len = {}
    for i, off in enumerate(sorted_offs):
        if i + 1 < len(sorted_offs):
            off_to_len[off] = sorted_offs[i+1] - off
        else:
            off_to_len[off] = tt_st - off
    
    # Find records with PVP template str_id
    pvp_records = []
    for h, off in hash_to_offset.items():
        length = off_to_len[off]
        if length < 8: continue
        rec = tt[off:off+length]
        hash_in_rec = struct.unpack('<I', rec[0:4])[0]
        str_id = struct.unpack('<I', rec[4:8])[0]
        if str_id in pvp_str_ids:
            pvp_records.append({
                'hash': h, 'offset': off, 'length': length,
                'str_id': str_id, 'rec_bytes': rec,
                'template': strings[str_id]['text'],
            })
    
    print(f'\nFound {len(pvp_records)} records with PVP template (unique str_ids: {len(set(r["str_id"] for r in pvp_records))})')
    
    # Distribution of lengths among PVP records
    pvp_len_counter = Counter(r['length'] for r in pvp_records)
    print(f'\nPVP record length distribution:')
    for ln, cnt in sorted(pvp_len_counter.items()):
        print(f'  {ln:4d} bytes: {cnt} records')
    
    # Show 10 PVP records' hex dumps
    print('\n--- 10 PVP records (first 10) ---')
    for r in pvp_records[:10]:
        print(f'\nRecord hash=0x{r["hash"]:08x} offset={r["offset"]} length={r["length"]} str_id={r["str_id"]}')
        print(f'  template: {r["template"]!r}')
        print(hex_dump(r["rec_bytes"], r["offset"], min(r["length"], 160)))
    
    # Save PVP records (without rec_bytes for JSON, but include the u32 params)
    parsed_pvp = []
    for r in pvp_records:
        rec = r['rec_bytes']
        # Read all u32s at every 4-byte aligned offset
        u32s = []
        for i in range(0, len(rec) - 3, 4):
            u32s.append(struct.unpack('<I', rec[i:i+4])[0])
        parsed_pvp.append({
            'hash': r['hash'],
            'offset': r['offset'],
            'length': r['length'],
            'str_id': r['str_id'],
            'template': r['template'],
            'u32s_aligned': u32s,
            'rec_hex': rec.hex(),
        })
    
    Path('/tmp/tt_pvp_records.json').write_text(json.dumps(parsed_pvp, ensure_ascii=False))
    print(f'\nSaved {len(parsed_pvp)} PVP records to /tmp/tt_pvp_records.json')

if __name__ == '__main__':
    main()
