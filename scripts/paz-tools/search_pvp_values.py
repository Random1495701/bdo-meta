#!/usr/bin/env python3
"""
Search the ENTIRE tooltiptable.dbss file for known PVP% values at every byte position.
Try multiple encodings.
Also extract the hashes from PVP sub-records and search for those hashes elsewhere in the file.
"""
import struct, json
from pathlib import Path
from collections import defaultdict

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

def main():
    tt = Path(TT_PATH).read_bytes()
    tt_off = Path(TT_OFF_PATH).read_bytes()
    tt_st = struct.unpack('<Q', tt[-8:])[0]
    
    strings = parse_pabr_strings(tt, tt_st)
    pvp_str_ids = set()
    for s in strings:
        if 'PVP' in s['text'].upper() and '피해 적용' in s['text']:
            pvp_str_ids.add(s['idx'])
    
    hash_to_offset = parse_offset_index(tt_off, tt_st)
    
    sorted_offs = sorted(hash_to_offset.values())
    off_to_len = {}
    for i, off in enumerate(sorted_offs):
        if i + 1 < len(sorted_offs):
            off_to_len[off] = sorted_offs[i+1] - off
        else:
            off_to_len[off] = tt_st - off
    
    # Get all PVP sub-record hashes
    pvp_sub_hashes = set()
    for h, off in hash_to_offset.items():
        length = off_to_len[off]
        rec = tt[off:off+length]
        for i in range(0, length - 20, 21):
            if i + 21 > length: break
            str_id = struct.unpack('<I', rec[i+4:i+8])[0]
            if str_id in pvp_str_ids:
                sub_hash = struct.unpack('<I', rec[i:i+4])[0]
                pvp_sub_hashes.add(sub_hash)
    
    print(f'PVP sub-record hashes: {len(pvp_sub_hashes)}')
    
    # Known skills with PVP%
    known_skills = {
        2951: 82.32, 1016: 50.00, 1180: 42.51, 1490: 70.00,
        5762: 92.48, 7198: 45.41, 3344: 85.00,
    }
    
    print('\n--- Search ENTIRE tooltiptable.dbss for known PVP% values ---')
    for sid, pvp_val in known_skills.items():
        # Encodings to try
        encodings = [
            ('u32_×100', struct.pack('<I', int(pvp_val * 100))),
            ('u32_×1000', struct.pack('<I', int(pvp_val * 1000))),
            ('u32_raw', struct.pack('<I', int(pvp_val))),
            ('u32_×10', struct.pack('<I', int(pvp_val * 10))),
            ('u16_×100', struct.pack('<H', int(pvp_val * 100))),
            ('u16_×1000', struct.pack('<H', int(pvp_val * 1000) & 0xFFFF) if int(pvp_val * 1000) < 65536 else None),
            ('u16_raw', struct.pack('<H', int(pvp_val))),
            ('float', struct.pack('<f', pvp_val)),
            ('float_0.01', struct.pack('<f', pvp_val * 0.01)),
            ('u8_×100', bytes([int(pvp_val * 100) & 0xFF]) if int(pvp_val * 100) < 256 else None),
        ]
        print(f'\n  Skill {sid} (PvP={pvp_val}):')
        for enc_name, val_bytes in encodings:
            if val_bytes is None: continue
            # Search the entire body (bytes 8 to tt_st)
            hits = []
            pos = 8
            while pos < tt_st:
                idx = tt.find(val_bytes, pos, tt_st)
                if idx < 0: break
                hits.append(idx)
                pos = idx + 1
            if hits:
                print(f'    {enc_name} ({val_bytes.hex()}): {len(hits)} hits, first 3: {hits[:3]}')
    
    # Also look at where each PVP sub-record's hash appears in the file (as a record offset reference)
    print('\n--- PVP sub-record hashes — search for them in offset index ---')
    for h in list(pvp_sub_hashes)[:5]:
        if h in hash_to_offset:
            print(f'  hash 0x{h:08x} → offset {hash_to_offset[h]} (IS in offset index)')
        else:
            print(f'  hash 0x{h:08x}: NOT in offset index')
    
    # Search for each PVP hash in the BODY of the file (might be referenced by other records)
    print('\n--- PVP sub-record hashes — search for them as u32 in records ---')
    for h in list(pvp_sub_hashes)[:10]:
        h_bytes = struct.pack('<I', h)
        hits = []
        pos = 8
        while pos < tt_st:
            idx = tt.find(h_bytes, pos, tt_st)
            if idx < 0: break
            hits.append(idx)
            pos = idx + 1
        print(f'  hash 0x{h:08x}: {len(hits)} hits in body, first 5: {hits[:5]}')

if __name__ == '__main__':
    main()
