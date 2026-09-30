#!/usr/bin/env python3
"""
Parse skillcommand.dbss + skillcommandoffset.dbss.

FORMAT DISCOVERED:
- skillcommandoffset.dbss:
  - [u32 count] (4 bytes) = 625
  - Then `count` entries, each 10 bytes:
    - [u16 skill_id] (2 bytes)
    - [u32 byte_offset] (4 bytes) - absolute byte offset in skillcommand.dbss
    - [u32 byte_length] (4 bytes) - byte length of the record content
- skillcommand.dbss:
  - [u32 count] (4 bytes) = 625
  - [u16 preamble_skill_id_marker] (2 bytes) - same as first record's skill_id
  - Then 625 records back-to-back, each:
    - [u16 skill_id] (2 bytes)
    - Variable number of length-prefixed UTF-16LE strings:
      - [u32 char_count] (4 bytes)
      - [u32 flag] (4 bytes) - 0 = UTF-16LE text, 1 = raw bytes
      - [UTF-16LE bytes] (char_count * 2 bytes if flag=0, char_count bytes if flag=1)
    - More structured data after the strings (PvP%, damage, etc.)
"""
import struct
import json
import os
import re

DBSS_PATH = '/tmp/skill-extract/skillcommand.dbss'
OFFSET_PATH = '/tmp/skill-extract/skillcommandoffset.dbss'
OUTPUT_JSON = '/home/z/my-project/data/skillcommand-records.json'

ICON_ID_PATTERNS = [
    re.compile(r'Skill_(\d+)\.dds'),
    re.compile(r'_Skill_(\d+)_'),
    # Class prefixes
    re.compile(r'P[A-Z]{2,3}_Skill_(\d+)'),
    # Generic fallback
    re.compile(r'Skill_(\d+)'),
]


def parse_offset_index(path):
    with open(path, 'rb') as f:
        data = f.read()
    count = struct.unpack('<I', data[:4])[0]
    entries = []
    pos = 4
    for i in range(count):
        if pos + 10 > len(data):
            break
        skill_id = struct.unpack('<H', data[pos:pos+2])[0]
        offset = struct.unpack('<I', data[pos+2:pos+6])[0]
        length = struct.unpack('<I', data[pos+6:pos+10])[0]
        entries.append((skill_id, offset, length))
        pos += 10
    return count, entries


def parse_record(data, offset, length):
    record_bytes = data[offset:offset+length]
    pos = 0
    strings = []
    rec_skill_id = struct.unpack('<H', record_bytes[:2])[0]
    pos = 2

    while pos + 8 <= length:
        char_count, flag = struct.unpack('<II', record_bytes[pos:pos+8])
        if char_count > 5000 or flag > 1:
            break
        if flag == 0:
            string_bytes = record_bytes[pos+8 : pos+8+char_count*2]
            if len(string_bytes) < char_count*2:
                break
            text = string_bytes.decode('utf-16-le', errors='replace')
            strings.append({'pos_in_record': pos, 'char_count': char_count, 'flag': 0, 'text': text})
            pos = pos + 8 + char_count*2
        elif flag == 1:
            raw_bytes = record_bytes[pos+8 : pos+8+char_count]
            if len(raw_bytes) < char_count:
                break
            strings.append({'pos_in_record': pos, 'char_count': char_count, 'flag': 1, 'raw': raw_bytes.hex()})
            pos = pos + 8 + char_count
        else:
            break

    remaining_bytes = record_bytes[pos:]

    return {
        'skill_id_in_record': rec_skill_id,
        'strings': strings,
        'structured_data_offset': pos,
        'structured_data_hex': remaining_bytes.hex() if len(remaining_bytes) < 1024 else remaining_bytes[:1024].hex() + '...',
        'structured_data_full_hex': remaining_bytes.hex(),
        'structured_data_length': len(remaining_bytes),
    }


def extract_icon_skill_id(strings):
    for s in strings:
        text = s.get('text', '')
        if not text:
            continue
        for pat in ICON_ID_PATTERNS:
            m = pat.search(text)
            if m:
                try:
                    return int(m.group(1))
                except ValueError:
                    pass
    return None


def main():
    count, offset_entries = parse_offset_index(OFFSET_PATH)
    print(f'Offset index count: {count}')
    print(f'Offset entries parsed: {len(offset_entries)}')

    with open(DBSS_PATH, 'rb') as f:
        data = f.read()
    print(f'skillcommand.dbss file size: {len(data)}')

    file_count = struct.unpack('<I', data[:4])[0]
    print(f'skillcommand.dbss count (u32@0): {file_count}')

    records = []
    for i, (skill_id, offset, length) in enumerate(offset_entries):
        try:
            rec = parse_record(data, offset, length)
            strings = rec['strings']
            icon_skill_id = extract_icon_skill_id(strings)
            clean_strings = [s['text'] for s in strings if 'text' in s]
            records.append({
                'record_index': i,
                'skill_id_offset_index': skill_id,
                'skill_id_in_record': rec['skill_id_in_record'],
                'offset': offset,
                'length': length,
                'strings': clean_strings,
                'icon_skill_id': icon_skill_id,
                'n_strings': len(strings),
                'structured_data_length': rec['structured_data_length'],
                'structured_data_hex': rec['structured_data_hex'],
                'structured_data_full_hex': rec['structured_data_full_hex'] if len(rec['structured_data_full_hex']) < 4096 else rec['structured_data_full_hex'][:4096] + '...',
            })
        except Exception as e:
            print(f'Error parsing record {i}: {e}')
            records.append({
                'record_index': i,
                'skill_id_offset_index': skill_id,
                'offset': offset,
                'length': length,
                'error': str(e),
            })

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f'Wrote {len(records)} records to {OUTPUT_JSON}')

    print('\n=== First 5 records ===')
    for r in records[:5]:
        print(f'\nRecord {r["record_index"]}: skill_id={r.get("skill_id_offset_index")}, '
              f'icon_skill_id={r.get("icon_skill_id")}, '
              f'n_strings={r.get("n_strings")}, '
              f'structured_data_length={r.get("structured_data_length")}')
        if 'strings' in r:
            for j, s in enumerate(r['strings']):
                if len(s) > 120:
                    s = s[:120] + '...'
                print(f'  [{j}] {s!r}')

    valid = [r for r in records if 'error' not in r]
    with_icon_id = [r for r in valid if r.get('icon_skill_id') is not None]
    with_structured = [r for r in valid if r.get('structured_data_length', 0) > 0]
    print(f'\n=== STATS ===')
    print(f'Valid records: {len(valid)}/{len(records)}')
    print(f'Records with extracted icon_skill_id: {len(with_icon_id)}/{len(valid)}')
    print(f'Records with structured_data after strings: {len(with_structured)}/{len(valid)}')
    if with_structured:
        sizes = [r['structured_data_length'] for r in with_structured]
        print(f'  structured_data sizes: min={min(sizes)}, max={max(sizes)}, avg={sum(sizes)//len(sizes)}')


if __name__ == '__main__':
    main()
