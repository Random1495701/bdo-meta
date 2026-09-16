#!/usr/bin/env python3
"""
Drill down on records at offsets where known PVP% values appeared.
Also try alternate hypothesis: maybe the PVP value is in a SEPARATE record
referenced by the parent record's hash.
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
    
    # Print strings 4251, 4252, 4253
    print('Strings around 4251:')
    for i in [4250, 4251, 4252, 4253, 4254]:
        print(f'  str_id={i}: {strings[i]["text"]!r}')
    
    hash_to_offset = parse_offset_index(tt_off, tt_st)
    
    sorted_offs = sorted(hash_to_offset.values())
    off_to_len = {}
    for i, off in enumerate(sorted_offs):
        if i + 1 < len(sorted_offs):
            off_to_len[off] = sorted_offs[i+1] - off
        else:
            off_to_len[off] = tt_st - off
    
    # Find record at offset 94117 (where Skill 1180's 42.51% appeared as u16_×100 at byte 4)
    print('\n--- Record at offset 94117 (where Skill 1180 PvP 42.51% matched) ---')
    for off_check in [94117, 94390, 49736, 65738, 15527, 90946]:
        if off_check in hash_to_offset.values():
            length = off_to_len[off_check]
            rec = tt[off_check:off_check+length]
            print(f'\nRecord at offset {off_check}, length {length}')
            for i in range(0, min(length, 80), 16):
                chunk = rec[i:i+16]
                h = ' '.join(f'{b:02x}' for b in chunk)
                a = ''.join(chr(b) if 32 <= b < 127 else '.' for b in chunk)
                print(f'  {off_check+i:08x}: {h:<48} {a}')
            # Parse sub-records
            print(f'  Sub-records (21-byte chunks):')
            for i in range(0, length - 20, 21):
                if i + 21 > length: break
                sub_hash = struct.unpack('<I', rec[i:i+4])[0]
                str_id = struct.unpack('<I', rec[i+4:i+8])[0]
                pc = struct.unpack('<I', rec[i+8:i+12])[0]
                p1 = struct.unpack('<I', rec[i+12:i+16])[0]
                p2 = struct.unpack('<I', rec[i+16:i+20])[0]
                trailing = rec[i+20] if i+20 < len(rec) else None
                str_text = strings[str_id]['text'] if str_id < len(strings) else '(out of range)'
                print(f'    sub@{i}: hash=0x{sub_hash:08x} str_id={str_id} pc={pc} p1={p1} p2={p2} tr={trailing}')
                print(f'      text: {str_text!r}')
    
    # Now let me look at the parent records of PVP sub-records
    # The PVP sub-records themselves have hash; let me find which records reference them
    print('\n--- PVP sub-record hashes referenced in OTHER records ---')
    pvp_str_ids = set()
    for s in strings:
        if 'PVP' in s['text'].upper() and '피해 적용' in s['text']:
            pvp_str_ids.add(s['idx'])
    
    pvp_sub_hashes = set()
    for h, off in hash_to_offset.items():
        length = off_to_len[off]
        rec = tt[off:off+length]
        for i in range(0, length - 20, 21):
            if i + 21 > length: break
            str_id = struct.unpack('<I', rec[i+4:i+8])[0]
            if str_id in pvp_str_ids:
                pvp_sub_hashes.add(struct.unpack('<I', rec[i:i+4])[0])
    
    print(f'  Total PVP sub-record hashes: {len(pvp_sub_hashes)}')
    
    # For each PVP sub-record hash, find where it appears as a u32 in OTHER records
    # (as a referenced hash, possibly indicating "this is the parent record containing PVP value")
    hash_hit_records = defaultdict(list)
    for h, off in hash_to_offset.items():
        length = off_to_len[off]
        rec = tt[off:off+length]
        # Read all u32 values at every 4-byte aligned offset
        for i in range(0, length - 3, 4):
            val = struct.unpack('<I', rec[i:i+4])[0]
            if val in pvp_sub_hashes:
                hash_hit_records[val].append((h, off, length, i))
    
    print(f'\n  PVP hashes referenced in other records:')
    for ph in list(pvp_sub_hashes)[:5]:
        hits = hash_hit_records.get(ph, [])
        # Skip self-references (where the hash matches at byte 0 of its own record)
        ext_hits = [h for h in hits if h[3] != 0]
        print(f'    PVP hash 0x{ph:08x}: {len(hits)} total refs, {len(ext_hits)} external')
        for h, off, length, byte_pos in ext_hits[:3]:
            print(f'      Referenced at parent_hash=0x{h:08x} offset={off} length={length} byte_pos={byte_pos}')
    
    # Now let me look at the parent records that REFERENCE PVP hashes
    # Maybe these parent records contain the PVP value at a different position
    print('\n--- Records that reference PVP hashes (likely the "data records" with values) ---')
    pvp_referenced_records = set()
    for ph, hits in hash_hit_records.items():
        for h, off, length, byte_pos in hits:
            if byte_pos != 0:  # External reference
                pvp_referenced_records.add(off)
    
    print(f'  Total records referencing PVP hashes: {len(pvp_referenced_records)}')
    
    # Dump a few of these
    for off in list(pvp_referenced_records)[:5]:
        length = off_to_len[off]
        rec = tt[off:off+length]
        print(f'\n  Record at offset {off}, length {length}')
        for i in range(0, min(length, 96), 16):
            chunk = rec[i:i+16]
            h = ' '.join(f'{b:02x}' for b in chunk)
            a = ''.join(chr(b) if 32 <= b < 127 else '.' for b in chunk)
            print(f'    {off+i:08x}: {h:<48} {a}')
        # Parse u32s at every position
        print(f'    All u32s (aligned):')
        for i in range(0, min(length, 80), 4):
            if i + 4 > length: break
            val = struct.unpack('<I', rec[i:i+4])[0]
            print(f'      @{i:3d}: 0x{val:08x} = {val}')

if __name__ == '__main__':
    main()
