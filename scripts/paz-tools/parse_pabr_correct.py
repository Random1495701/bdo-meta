#!/usr/bin/env python3
"""
Properly parse PABR string table at end of tooltiptable.dbss.
Format (per bdo-data-extractor):
  [u32 count][u8 sep=0x01]
  count × ([u32 byteLen][UTF-16 LE bytes][u8 sep])
Strings section starts at tt_st + 5 (5-byte header).
"""
import struct, json, re
from pathlib import Path
from collections import Counter

TT_PATH = '/home/z/my-project/upload/tooltiptable.dbss'
TT_OFF_PATH = '/home/z/my-project/upload/tooltiptableoffset.dbss'

def parse_pabr_strings(data, start):
    """Parse PABR strings starting at byte `start` (5-byte header).
    Format: [u32 count][u8 sep] then count × ([u32 byteLen][bytes][u8 sep])
    """
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
        strings.append({'idx': i, 'text': text, 'byte_offset': pos - byte_len - (1 if pos > 0 and data[pos-1:pos] == bytes([sep]) else 0) - 4, 'byte_len': byte_len})
    return strings, count, sep

def main():
    tt = Path(TT_PATH).read_bytes()
    tt_off = Path(TT_OFF_PATH).read_bytes()
    tt_st = struct.unpack('<Q', tt[-8:])[0]
    print(f'tt.dbss size={len(tt):,}, tt_st={tt_st}')
    print(f'String section: bytes {tt_st} to {len(tt)-8} ({len(tt)-8-tt_st} bytes)')
    
    # Parse PABR strings starting at tt_st (5-byte header)
    strings, str_count, sep = parse_pabr_strings(tt, tt_st)
    print(f'Parsed {len(strings)} strings (count field = {str_count}, sep = 0x{sep:02x})')
    
    # Find PVP templates
    pvp_str_ids = []
    for s in strings:
        if 'PVP' in s['text'].upper() and '피해 적용' in s['text']:
            pvp_str_ids.append(s)
    print(f'\nPVP templates found: {len(pvp_str_ids)}')
    for s in pvp_str_ids[:10]:
        print(f'  str_id={s["idx"]:3d}: {s["text"]!r}')
    if len(pvp_str_ids) > 10:
        print(f'  ... and {len(pvp_str_ids)-10} more')
    
    # Save strings + PVP template IDs
    Path('/tmp/tt_strings.json').write_text(json.dumps([
        {'idx': s['idx'], 'text': s['text']}
        for s in strings
    ], ensure_ascii=False))
    Path('/tmp/tt_pvp_template_ids.json').write_text(json.dumps([
        {'idx': s['idx'], 'text': s['text']} for s in pvp_str_ids
    ], ensure_ascii=False))
    print(f'\nSaved strings to /tmp/tt_strings.json and PVP template IDs to /tmp/tt_pvp_template_ids.json')

if __name__ == '__main__':
    main()
