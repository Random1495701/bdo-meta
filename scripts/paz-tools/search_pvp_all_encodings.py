#!/usr/bin/env python3
"""
Comprehensive search for all 13 PVP values in tooltiptable.dbss.
Try multiple encodings: u32 × 100, u16 × 100, u16 × 1000, float, etc.
For each hit, identify the containing record and report the relative byte position.
Then look for patterns.
"""
import struct, json, sqlite3
from pathlib import Path
from collections import defaultdict

TT_PATH = '/home/z/my-project/upload/tooltiptable.dbss'
TT_OFF_PATH = '/home/z/my-project/upload/tooltiptableoffset.dbss'

def main():
    tt = Path(TT_PATH).read_bytes()
    tt_off = Path(TT_OFF_PATH).read_bytes()
    tt_st = struct.unpack('<Q', tt[-8:])[0]
    
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
    sorted_offs = sorted(hash_to_offset.values())
    off_to_len = {}
    for i, off in enumerate(sorted_offs):
        if i + 1 < len(sorted_offs):
            off_to_len[off] = sorted_offs[i+1] - off
        else:
            off_to_len[off] = tt_st - off
    
    # Get the 13 PVP values
    conn = sqlite3.connect('/home/z/my-project/db/custom.db')
    c = conn.cursor()
    skills = [2951, 1016, 1180, 1490, 5762, 7198, 3344, 2426, 5110, 133, 1078, 219, 6569]
    pvp_values = {}
    for sid in skills:
        row = c.execute('SELECT pvpDamagePercent FROM skills WHERE skillId = ?', (sid,)).fetchone()
        if row and row[0] is not None:
            pvp_values[sid] = row[0]
    
    print('Known PVP values:')
    for sid, val in pvp_values.items():
        print(f'  Skill {sid}: {val}%')
    
    # Try multiple encodings
    encodings = [
        ('u32_×100', lambda v: struct.pack('<I', int(round(v * 100)))),
        ('u32_×1000', lambda v: struct.pack('<I', int(round(v * 1000)))),
        ('u32_×10', lambda v: struct.pack('<I', int(round(v * 10)))),
        ('u32_raw', lambda v: struct.pack('<I', int(v))),
        ('u16_×100', lambda v: struct.pack('<H', int(round(v * 100)))),
        ('u16_×1000', lambda v: struct.pack('<H', int(round(v * 1000)) & 0xFFFF)),
        ('u16_×10', lambda v: struct.pack('<H', int(round(v * 10)))),
        ('u16_raw', lambda v: struct.pack('<H', int(v))),
        ('u8_raw', lambda v: bytes([int(v)]) if int(v) < 256 else None),
        ('u8_×100', lambda v: bytes([int(round(v * 100)) & 0xFF]) if int(round(v * 100)) < 256 else None),
        ('float', lambda v: struct.pack('<f', v)),
        ('float_0.01', lambda v: struct.pack('<f', v * 0.01)),
        ('float_100', lambda v: struct.pack('<f', v * 100.0)),
        ('float_0.001', lambda v: struct.pack('<f', v * 0.001)),
    ]
    
    # For each skill, search and find which encodings match
    print('\n=== Search results ===')
    all_hits = []  # (skill_id, encoding, byte_offset, record_offset, rel_byte_pos)
    
    for sid, pvp_val in pvp_values.items():
        print(f'\nSkill {sid} (PvP={pvp_val}):')
        for enc_name, enc_fn in encodings:
            try:
                val_bytes = enc_fn(pvp_val)
                if val_bytes is None: continue
            except:
                continue
            hits = []
            pos = 8
            while pos < tt_st:
                idx = tt.find(val_bytes, pos, tt_st)
                if idx < 0: break
                hits.append(idx)
                pos = idx + 1
            if hits:
                print(f'  {enc_name} ({val_bytes.hex()}): {len(hits)} hits')
                for h in hits[:5]:
                    # Find record containing this offset
                    for i, off in enumerate(sorted_offs):
                        next_off = sorted_offs[i+1] if i+1 < len(sorted_offs) else tt_st
                        if off <= h < next_off:
                            rel = h - off
                            length = next_off - off
                            print(f'    byte={h} → record at {off} (len={length}), rel byte pos = {rel}')
                            all_hits.append((sid, enc_name, h, off, rel, length))
                            break
    
    # Now look at the records containing hits and see if there's a pattern
    # Specifically look at hits where rel byte pos is NOT 4 (str_id position)
    print('\n=== Hits at NON-str_id positions (rel != 4) ===')
    for sid, enc, byte_off, rec_off, rel, length in all_hits:
        if rel != 4:
            print(f'  Skill {sid} ({enc}): byte={byte_off} record at {rec_off} rel={rel} len={length}')
    
    # Look for hits at the SAME relative byte position across multiple skills
    print('\n=== Hits grouped by relative byte position ===')
    by_rel = defaultdict(list)
    for sid, enc, byte_off, rec_off, rel, length in all_hits:
        by_rel[rel].append((sid, enc, byte_off, rec_off, length))
    for rel, hits in sorted(by_rel.items()):
        if len(hits) > 1:
            print(f'  rel={rel}: {len(hits)} hits')
            for h in hits[:10]:
                print(f'    {h}')
    
    # Check: do PVP values appear in records whose sub-records have a PVP template str_id?
    print('\n=== Check if records containing PVP value hits have PVP template sub-records ===')
    # Get PVP template str_ids
    count = struct.unpack('<I', tt[tt_st:tt_st+4])[0]
    sep = tt[tt_st+4]
    pos = tt_st + 5
    strings = []
    for i in range(count):
        if pos + 4 > len(tt): break
        byte_len = struct.unpack('<I', tt[pos:pos+4])[0]
        pos += 4
        if pos + byte_len > len(tt): break
        text_bytes = tt[pos:pos+byte_len]
        pos += byte_len
        if pos < len(tt) and tt[pos] == sep:
            pos += 1
        try:
            strings.append(text_bytes.decode('utf-16-le', errors='replace'))
        except:
            strings.append('')
    
    pvp_str_ids = set()
    for i, s in enumerate(strings):
        if 'PVP' in s.upper() and '피해 적용' in s:
            pvp_str_ids.add(i)
    print(f'  PVP template str_ids: {len(pvp_str_ids)}')
    
    # For each record containing a hit, check if any of its sub-records has a PVP str_id
    rec_with_pvp = set()
    for off in sorted_offs:
        length = off_to_len[off]
        rec = tt[off:off+length]
        for i in range(0, length - 7, 4):  # Check all 4-byte aligned positions
            if i + 8 > length: break
            str_id = struct.unpack('<I', rec[i+4:i+8])[0]
            if str_id in pvp_str_ids:
                rec_with_pvp.add(off)
                break
    print(f'  Records containing PVP template str_id (at any aligned pos): {len(rec_with_pvp)}')
    
    # For each hit, check if it's in a record with PVP template
    print('\n=== Hits in records WITH PVP template str_id ===')
    for sid, enc, byte_off, rec_off, rel, length in all_hits:
        if rec_off in rec_with_pvp:
            print(f'  Skill {sid} ({enc}): byte={byte_off} record at {rec_off} rel={rel}')

if __name__ == '__main__':
    main()
