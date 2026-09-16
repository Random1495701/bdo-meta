#!/usr/bin/env python3
"""
Search ALL records (not just PVP templates) for records with PVP str_ids.
Check if some records have non-zero params (containing the actual PVP%).
Also search the file for known PVP% values (82, 50, 42, 70, 92, 45, 85, etc.)
as u32 LE at every byte position.
"""
import struct, json
from pathlib import Path
from collections import defaultdict, Counter

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
    print(f'Parsed {len(strings)} PABR strings')
    
    # Find PVP template str_ids
    pvp_str_ids = set()
    for s in strings:
        if 'PVP' in s['text'].upper() and '피해 적용' in s['text']:
            pvp_str_ids.add(s['idx'])
    print(f'PVP template str_ids: {len(pvp_str_ids)}')
    
    hash_to_offset = parse_offset_index(tt_off, tt_st)
    print(f'Hash→offset entries: {len(hash_to_offset)}')
    
    sorted_offs = sorted(hash_to_offset.values())
    off_to_len = {}
    for i, off in enumerate(sorted_offs):
        if i + 1 < len(sorted_offs):
            off_to_len[off] = sorted_offs[i+1] - off
        else:
            off_to_len[off] = tt_st - off
    
    # Iterate ALL records, parse sub-records (21 bytes each), find sub-records with PVP str_ids
    print('\n--- ALL sub-records with PVP str_ids ---')
    pvp_sub_records = []
    for h, off in hash_to_offset.items():
        length = off_to_len[off]
        rec = tt[off:off+length]
        # Parse 21-byte sub-records
        for i in range(0, length - 20, 21):
            if i + 21 > length: break
            sub_hash = struct.unpack('<I', rec[i:i+4])[0]
            str_id = struct.unpack('<I', rec[i+4:i+8])[0]
            param_count = struct.unpack('<I', rec[i+8:i+12])[0]
            p1 = struct.unpack('<I', rec[i+12:i+16])[0]
            p2 = struct.unpack('<I', rec[i+16:i+20])[0]
            trailing = rec[i+20] if i+20 < len(rec) else 0
            if str_id in pvp_str_ids:
                pvp_sub_records.append({
                    'parent_hash': h, 'parent_offset': off, 'parent_length': length,
                    'sub_offset': off + i, 'sub_index': i // 21,
                    'sub_hash': sub_hash, 'str_id': str_id,
                    'param_count': param_count,
                    'p1': p1, 'p2': p2, 'trailing': trailing,
                    'template': strings[str_id]['text'],
                })
    
    print(f'Total PVP sub-records: {len(pvp_sub_records)}')
    
    # How many have non-zero p1 or p2?
    nonzero_p1 = sum(1 for r in pvp_sub_records if r['p1'] != 0)
    nonzero_p2 = sum(1 for r in pvp_sub_records if r['p2'] != 0)
    print(f'  with non-zero p1 (byte 12): {nonzero_p1}')
    print(f'  with non-zero p2 (byte 16): {nonzero_p2}')
    
    # Show some sub-records with non-zero p1
    print(f'\n--- PVP sub-records with non-zero p1 (byte 12) ---')
    nonzero_recs = [r for r in pvp_sub_records if r['p1'] != 0]
    for r in nonzero_recs[:15]:
        print(f"  str_id={r['str_id']:3d} parent_hash=0x{r['parent_hash']:08x} p1={r['p1']} p2={r['p2']} pc={r['param_count']}")
        print(f"    template: {r['template']!r}")
    
    # Look at the byte values for ALL PVP sub-records (not just aligned)
    print(f'\n--- Search PVP sub-records for known PvP% values ---')
    # Known skills with PVP%
    known_skills = {
        2951: 82.32,  # Soul Ascent I
        1016: 50.00,  # Evasive Explosion Shot I
        1180: 42.51,  # Elastic Force II
        1490: 70.00,  # Sharp Light I
        5762: 92.48,  # Vengeful Star IV
        7198: 45.41,  # Flower Shroud II
        3344: 85.00,  # Earth Kick II
    }
    
    # Search each PVP sub-record's bytes for these values
    for sid, pvp_val in known_skills.items():
        # Try various encodings
        encodings = [
            ('u32_×100', int(pvp_val * 100), 4),
            ('u32_×1000', int(pvp_val * 1000), 4),
            ('u32_raw', int(pvp_val), 4),
            ('u16_×100', int(pvp_val * 100), 2),
            ('u16_raw', int(pvp_val), 2),
        ]
        print(f'\n  Skill {sid} (PvP={pvp_val}):')
        for enc_name, val, sz in encodings:
            val_bytes = struct.pack('<I' if sz == 4 else '<H', val)
            # Search all PVP sub-records for this byte pattern
            hits = 0
            hit_records = []
            for r in pvp_sub_records:
                # Get the sub-record bytes from the parent record
                parent_off = r['parent_offset']
                sub_off_in_parent = r['sub_offset'] - parent_off
                parent_len = r['parent_length']
                parent_rec = tt[parent_off:parent_off + parent_len]
                sub_bytes = parent_rec[sub_off_in_parent:sub_off_in_parent + 21]
                if val_bytes in sub_bytes:
                    hits += 1
                    hit_records.append(r)
            if hits > 0:
                print(f'    {enc_name}={val} ({val_bytes.hex()}): {hits} hits')
                for r in hit_records[:3]:
                    print(f'      str_id={r["str_id"]:3d} parent=0x{r["parent_hash"]:08x} offset={r["parent_offset"]} p1={r["p1"]} p2={r["p2"]}')
    
    # Save sub-records for further analysis
    Path('/tmp/tt_pvp_subrecords.json').write_text(json.dumps(pvp_sub_records, ensure_ascii=False))
    print(f'\nSaved {len(pvp_sub_records)} PVP sub-records to /tmp/tt_pvp_subrecords.json')

if __name__ == '__main__':
    main()
