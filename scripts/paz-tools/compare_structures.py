#!/usr/bin/env python3
"""
Compare structure of decrypted commandtooltip.dbss with tooltiptable.dbss.
If tooltiptable.dbss has similar repeating 8-byte blocks, we can understand
the structure better.
"""
import struct
from collections import Counter
from pathlib import Path

DEC = Path("/tmp/cmdtt/cmdtt_ice_go_decrypted.bin")
RAW = Path("/home/z/my-project/upload/commandtooltip.dbss")
TT = Path("/home/z/my-project/upload/tooltiptable.dbss")

dec = DEC.read_bytes()
raw = RAW.read_bytes()
tt = TT.read_bytes()

# Find most common 8-byte blocks in tooltiptable.dbss
print("=== Most common 8-byte blocks in tooltiptable.dbss (plaintext PABR) ===")
blocks_tt = Counter()
for i in range(0, len(tt)-8, 8):
    blocks_tt[bytes(tt[i:i+8])] += 1
for block, count in blocks_tt.most_common(15):
    # Try to interpret block as ASCII
    ascii_rep = "".join(chr(b) if 32 <= b < 127 else "." for b in block)
    print(f"  {block.hex()}: {count}  ASCII: {ascii_rep}")

# Now check the structure: PABR format = [PABR][u32 count][... records ...][u64 string_table_offset]
# Let me read tooltiptable's PABR header
print("\n=== tooltiptable.dbss PABR structure ===")
print(f"  Magic: {tt[:4]}")
print(f"  Count: {struct.unpack('<I', tt[4:8])[0]}")
print(f"  Last 8 bytes (string table pointer): {tt[-8:].hex()} = u64 LE = {struct.unpack('<Q', tt[-8:])[0]}")

# Same for commandtooltipoffset.dbss
print("\n=== commandtooltipoffset.dbss PABR structure ===")
OFF = Path("/home/z/my-project/upload/commandtooltipoffset.dbss")
off_data = OFF.read_bytes()
print(f"  Magic: {off_data[:4]}")
print(f"  Count: {struct.unpack('<I', off_data[4:8])[0]}")
print(f"  Last 8 bytes: {off_data[-8:].hex()}")

# Now check the decrypted commandtooltip.dbss: does it have a u64 at the end (string table pointer)?
print("\n=== Decrypted commandtooltip.dbss last 16 bytes ===")
print(f"  Last 16 bytes hex: {dec[-16:].hex()}")
print(f"  Last 8 bytes as u64 LE: {struct.unpack('<Q', dec[-8:])[0]}")
print(f"  Last 8 bytes as u64 BE: {struct.unpack('>Q', dec[-8:])[0]}")
# If this is a string table pointer, it should be < len(dec) and > 0
ptr = struct.unpack('<Q', dec[-8:])[0]
print(f"  Pointer as file offset: {ptr} (file size = {len(dec)})")
# Check if last 8 bytes are 0 (no string table)
print(f"  All zeros? {dec[-8:] == b'\\x00' * 8}")

# Now check the encrypted file's last 16 bytes
print("\n=== Raw (encrypted) commandtooltip.dbss last 16 bytes ===")
print(f"  Last 16 bytes hex: {raw[-16:].hex()}")

# Look at the offset index entries' "key" field — maybe these keys are some hash
# Let me see if the first entry's key (0xcd7689b0) corresponds to a known value
print("\n=== Offset index first entry's key as different formats ===")
import json
entries = json.loads(Path("/tmp/cmdtt/offset_entries.json").read_text())
e0 = entries[0]
key0 = e0['key']
print(f"  key (u32): {key0} = 0x{key0:08x}")
print(f"  key as bytes LE: {struct.pack('<I', key0).hex()}")
print(f"  key as bytes BE: {struct.pack('>I', key0).hex()}")

# Try: search for the key (as u32 LE) in the decrypted file's first record
print(f"\n=== Search for offset index keys in decrypted file ===")
rec0_start = e0['offset']
rec0_size = e0['size']
rec0 = dec[rec0_start:rec0_start + rec0_size]
print(f"  Record 0: offset={rec0_start}, size={rec0_size}")
print(f"  First 32 bytes: {rec0[:32].hex()}")
print(f"  Last 32 bytes: {rec0[-32:].hex()}")

# Look for the key bytes in the record
key_le = struct.pack('<I', key0)
key_be = struct.pack('>I', key0)
print(f"  Key LE bytes ({key_le.hex()}) in record: {rec0.count(key_le)} occurrences")
print(f"  Key BE bytes ({key_be.hex()}) in record: {rec0.count(key_be)} occurrences")

# Try: maybe the offset index key is a CRC32 of the record content
import zlib
crc = zlib.crc32(rec0) & 0xFFFFFFFF
print(f"  CRC32 of record 0: 0x{crc:08x} (key=0x{key0:08x})")
# Doesn't match? Let me try CRC32 with different start values or adler32
adler = zlib.adler32(rec0) & 0xFFFFFFFF
print(f"  Adler32 of record 0: 0x{adler:08x}")

# Try: maybe the key is the FIRST u32 of the record (in some endianness)
print(f"  Record 0 first u32 LE: 0x{struct.unpack('<I', rec0[:4])[0]:08x}")
print(f"  Record 0 first u32 BE: 0x{struct.unpack('>I', rec0[:4])[0]:08x}")

# Look at last 4 bytes of record 0 (maybe key is at the end)
print(f"  Record 0 last u32 LE: 0x{struct.unpack('<I', rec0[-4:])[0]:08x}")
print(f"  Record 0 last u32 BE: 0x{struct.unpack('>I', rec0[-4:])[0]:08x}")

# Try: look at the keys of records 1-5 and check first/last u32 of those records
print(f"\n=== Cross-check: keys vs record first/last u32 for first 10 records ===")
for i, e in enumerate(entries[:10]):
    rec = dec[e['offset']:e['offset']+e['size']]
    key = e['key']
    first4_le = struct.unpack('<I', rec[:4])[0]
    first4_be = struct.unpack('>I', rec[:4])[0]
    last4_le = struct.unpack('<I', rec[-4:])[0]
    last4_be = struct.unpack('>I', rec[-4:])[0]
    crc = zlib.crc32(rec) & 0xFFFFFFFF
    print(f"  rec {i} (offset={e['offset']}, size={e['size']}): key=0x{key:08x}, "
          f"first4_LE=0x{first4_le:08x}, first4_BE=0x{first4_be:08x}, "
          f"last4_LE=0x{last4_le:08x}, CRC32=0x{crc:08x}")
