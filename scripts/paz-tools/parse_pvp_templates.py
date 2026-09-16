#!/usr/bin/env python3
"""
Parse PABR string table at start of tooltiptable.dbss (proper format).
Find PVP templates. Map str_id → template text.
Then dump records with their hash/str_id/params for inspection.
"""
import struct, json, re
from pathlib import Path
from collections import Counter

TT_PATH = '/home/z/my-project/upload/tooltiptable.dbss'
TT_OFF_PATH = '/home/z/my-project/upload/tooltiptableoffset.dbss'

def parse_pabr_strings(data):
    """Parse PABR string table format:
    [4-byte magic "PABR"][u32 count][u8 sep]
    then count × ([u32 byteLen][bytes][u8 sep])
    Returns list of (text, byte_offset_in_file).
    """
    assert data[:4] == b'PABR', f'not PABR: {data[:4]}'
    count = struct.unpack('<I', data[4:8])[0]
    sep = data[8]
    pos = 9
    strings = []
    for i in range(count):
        if pos + 4 > len(data): break
        byte_len = struct.unpack('<I', data[pos:pos+4])[0]
        pos += 4
        if pos + byte_len > len(data): break
        text_bytes = data[pos:pos+byte_len]
        pos += byte_len
        # Optional sep byte
        if pos < len(data) and data[pos] == sep:
            pos += 1
        try:
            text = text_bytes.decode('utf-16-le', errors='replace')
        except:
            text = ''
        strings.append({'idx': i, 'text': text, 'byte_offset': pos - byte_len - 4, 'byte_len': byte_len})
    return strings, count

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
    print(f'tt.dbss size={len(tt):,}, body ends at (tt_st)={tt_st}')
    
    # Parse PABR string table at start
    strings, str_count = parse_pabr_strings(tt)
    print(f'Parsed {len(strings)} strings (count field = {str_count})')
    
    # Find PVP-related templates
    print('\n--- PVP templates ---')
    pvp_str_ids = []
    for s in strings:
        if 'PVP' in s['text'].upper() and ('피해 적용' in s['text'] or 'p0' in s['text']):
            pvp_str_ids.append(s)
            print(f'  str_id={s["idx"]:3d}: {s["text"]!r}')
    
    # Also find damage-related templates
    print('\n--- Damage templates (first 10 with 피해) ---')
    dmg_count = 0
    for s in strings:
        if '피해' in s['text'] and dmg_count < 10:
            print(f'  str_id={s["idx"]:3d}: {s["text"]!r}')
            dmg_count += 1
    
    # Parse offset index to get record (hash, offset) pairs
    start_pos_off = struct.unpack('<Q', tt_off[-8:])[0]
    rows = (start_pos_off - 8) // 16
    hash_to_offset = {}
    for i in range(rows):
        base = 8 + i * 16
        a, b, c, d = struct.unpack('<IIII', tt_off[base:base+16])
        if 8 <= b < tt_st:
            hash_to_offset[a] = b
        if 8 <= d < tt_st:
            hash_to_offset[c] = d
    
    # Compute record lengths
    sorted_offs = sorted(hash_to_offset.values())
    off_to_len = {}
    for i, off in enumerate(sorted_offs):
        if i + 1 < len(sorted_offs):
            off_to_len[off] = sorted_offs[i+1] - off
        else:
            off_to_len[off] = tt_st - off
    
    # For each record, read the header (hash + str_id) and find PVP-template records
    pvp_records = []
    for h, off in hash_to_offset.items():
        length = off_to_len[off]
        rec = tt[off:off+length]
        if len(rec) < 8: continue
        hash_in_rec = struct.unpack('<I', rec[0:4])[0]
        str_id = struct.unpack('<I', rec[4:8])[0]
        # Verify hash_in_rec matches h
        if hash_in_rec != h:
            # Some records may have hash at offset 0 that doesn't match the index hash — that's OK
            pass
        # Check if str_id corresponds to a PVP template
        if str_id < len(strings):
            text = strings[str_id]['text']
            if 'PVP' in text.upper() and '피해 적용' in text:
                pvp_records.append({
                    'hash': h, 'offset': off, 'length': length,
                    'str_id': str_id, 'template': text,
                    'rec_bytes': rec,
                })
    
    print(f'\n--- Found {len(pvp_records)} records with PVP template ---')
    print(f'Unique hashes: {len(set(r["hash"] for r in pvp_records))}')
    
    # Hex-dump first 10 PVP records
    print('\n--- First 10 PVP records hex dump ---')
    for r in pvp_records[:10]:
        print(f'\nRecord hash=0x{r["hash"]:08x} offset={r["offset"]} length={r["length"]} str_id={r["str_id"]}')
        print(f'  template: {r["template"]!r}')
        print(hex_dump(r["rec_bytes"], r["offset"], min(r["length"], 128)))
    
    # Save strings + pvp records
    Path('/tmp/tt_strings.json').write_text(json.dumps([
        {'idx': s['idx'], 'text': s['text'], 'byte_offset': s['byte_offset']}
        for s in strings
    ], ensure_ascii=False))
    print(f'\nSaved {len(strings)} strings to /tmp/tt_strings.json')
    
    # Save PVP record info (without rec_bytes for JSON)
    Path('/tmp/tt_pvp_records.json').write_text(json.dumps([
        {k: v for k, v in r.items() if k != 'rec_bytes'}
        for r in pvp_records
    ]))
    print(f'Saved {len(pvp_records)} PVP record infos to /tmp/tt_pvp_records.json')

if __name__ == '__main__':
    main()
