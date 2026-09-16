#!/usr/bin/env python3
"""
Try parsing PABR string table with bdo-data-extractor format:
  [u32 count][u8 sep] then count × ([u32 byteLen][bytes][u8 sep])
The header at tt_st is 9 bytes (count u32 + ??? u32 + sep u8). Let me try variations.
"""
import struct
from pathlib import Path

tt = Path('/home/z/my-project/upload/tooltiptable.dbss').read_bytes()
tt_st = struct.unpack('<Q', tt[-8:])[0]
print(f'tt_st = {tt_st}')
print(f'String section size: {len(tt) - 8 - tt_st} bytes')

# Header at tt_st:
# bytes 0-3: count = 4355
# bytes 4-7: ??? = 30209 (0x00007601)
# byte 8: 0x00
# bytes 9+: strings

count = struct.unpack('<I', tt[tt_st:tt_st+4])[0]
field2 = struct.unpack('<I', tt[tt_st+4:tt_st+8])[0]
sep_byte = tt[tt_st+8]
print(f'Header: count={count}, field2={field2}, sep=0x{sep_byte:02x}')

# Try the bdo-data-extractor format:
# count × ([u32 byteLen][bytes][u8 sep]) starting at tt_st + 9
def try_parse_v1(data, start, count):
    """[u32 byteLen][bytes][u8 sep]"""
    strings = []
    pos = start
    for i in range(count):
        if pos + 4 > len(data): break
        byte_len = struct.unpack('<I', data[pos:pos+4])[0]
        pos += 4
        if pos + byte_len > len(data): break
        text_bytes = data[pos:pos+byte_len]
        pos += byte_len
        if pos < len(data) and data[pos] == sep_byte:
            pos += 1
        try:
            text = text_bytes.decode('utf-16-le', errors='replace')
        except:
            text = ''
        strings.append((i, pos - byte_len - 4, byte_len, text))
    return strings, pos

# Try at tt_st + 9 (after 9-byte header)
strings_v1, end_v1 = try_parse_v1(tt, tt_st + 9, count)
print(f'\nV1 (start at tt_st+9): parsed {len(strings_v1)} strings, ended at byte {end_v1}')
if strings_v1:
    print(f'  First: byte_len={strings_v1[0][2]}, text={strings_v1[0][3]!r}')
    print(f'  Second: byte_len={strings_v1[1][2]}, text={strings_v1[1][3]!r}')

# Try at tt_st + 8 (skip 8-byte header: count + field2, no sep)
strings_v2, end_v2 = try_parse_v1(tt, tt_st + 8, count)
print(f'\nV2 (start at tt_st+8): parsed {len(strings_v2)} strings, ended at byte {end_v2}')
if strings_v2:
    print(f'  First: byte_len={strings_v2[0][2]}, text={strings_v2[0][3]!r}')

# Try at tt_st + 5 (5-byte header: count u32 + sep u8)
def try_parse_v3(data, start, count):
    """[u32 byteLen][bytes][u8 sep] starting after 5-byte header"""
    strings = []
    pos = start
    for i in range(count):
        if pos + 4 > len(data): break
        byte_len = struct.unpack('<I', data[pos:pos+4])[0]
        pos += 4
        if pos + byte_len > len(data): break
        text_bytes = data[pos:pos+byte_len]
        pos += byte_len
        if pos < len(data) and data[pos] == 0x00:
            pos += 1
        try:
            text = text_bytes.decode('utf-16-le', errors='replace')
        except:
            text = ''
        strings.append((i, pos - byte_len - 4, byte_len, text))
    return strings, pos

strings_v3, end_v3 = try_parse_v3(tt, tt_st + 5, count)
print(f'\nV3 (start at tt_st+5, 5-byte header): parsed {len(strings_v3)} strings, ended at byte {end_v3}')
if strings_v3:
    print(f'  First: byte_len={strings_v3[0][2]}, text={strings_v3[0][3]!r}')

# Try at tt_st + 4 (4-byte header: count u32 only)
strings_v4, end_v4 = try_parse_v1(tt, tt_st + 4, count)
print(f'\nV4 (start at tt_st+4): parsed {len(strings_v4)} strings, ended at byte {end_v4}')
if strings_v4:
    print(f'  First: byte_len={strings_v4[0][2]}, text={strings_v4[0][3]!r}')
    print(f'  Second: byte_len={strings_v4[1][2]}, text={strings_v4[1][3]!r}')

# Try parsing with hypothesis that bytes 4-7 (0x00007601 = 30209) is actually a u16 + u16 pair
# Or maybe it's the offset of the first record from tt_st
# Or it's the total byte count of all strings

# Try hypothesis: field2 = 0x00007601 = total bytes of strings section (excluding headers)
# Total string section = 883329 - 8 - 96742 = 786579. field2 = 30209 doesn't match.

# Try hypothesis: bytes 4-7 is [u8 sep1][u8 sep2][u8 sep3][u8 sep4]
# 01 76 00 00 = sep1=0x01, sep2=0x76, sep3=0x00, sep4=0x00
# This is weird.

# What if the format is [u32 count][u8 sep1=0x01][u8 sep2=0x76][u8 sep3=0x00][u8 sep4=0x00]?
# Then strings start at tt_st + 8, with format [u32 byteLen][bytes][u8 sep1]?
strings_v5, end_v5 = try_parse_v1(tt, tt_st + 8, count)
print(f'\nV5 (start at tt_st+8, with sep=0x00): parsed {len(strings_v5)} strings')
# Let me check if sep byte differs
sep_variants = [0x00, 0x01, 0x90, 0x76]
for sep in sep_variants:
    strings_test = []
    pos = tt_st + 9
    valid = 0
    for i in range(count):
        if pos + 4 > len(tt): break
        byte_len = struct.unpack('<I', tt[pos:pos+4])[0]
        if byte_len > 10000 or byte_len < 2:
            break
        pos += 4
        if pos + byte_len > len(tt): break
        pos += byte_len
        if pos < len(tt) and tt[pos] == sep:
            pos += 1
        valid += 1
    print(f'  sep=0x{sep:02x}: parsed {valid} strings')
