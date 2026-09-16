#!/usr/bin/env python3
"""
Look for repeating 8-byte XOR pattern after ICE decryption.
If the encryption is XOR(ICE(plaintext)) or ICE(XOR(plaintext)) with 8-byte XOR,
then after ICE decryption, each position mod 8 should have a dominant byte = key.
"""
import struct
import math
from collections import Counter
from pathlib import Path

ICE_DEC = Path("/tmp/cmdtt/cmdtt_ice_go_decrypted.bin")
RAW = Path("/home/z/my-project/upload/commandtooltip.dbss")

def shannon(data):
    if not data: return 0.0
    freq = Counter(data)
    n = len(data)
    h = 0.0
    for c in freq.values():
        p = c / n
        h -= p * math.log2(p)
    return h

dec = ICE_DEC.read_bytes()
raw = RAW.read_bytes()

print(f"=== Position-mod-8 byte frequency in ICE-decrypted file ===")
for pos in range(8):
    bytes_at_pos = [dec[i] for i in range(pos, len(dec), 8)]
    c = Counter(bytes_at_pos)
    top_byte, top_count = c.most_common(1)[0]
    second = c.most_common(2)[1]
    print(f"  pos {pos}: top byte 0x{top_byte:02x} ({100*top_count/len(bytes_at_pos):.2f}%), "
          f"second 0x{second[0]:02x} ({100*second[1]/len(bytes_at_pos):.2f}%)")

print(f"\n=== Position-mod-8 byte frequency in RAW (encrypted) file ===")
for pos in range(8):
    bytes_at_pos = [raw[i] for i in range(pos, len(raw), 8)]
    c = Counter(bytes_at_pos)
    top_byte, top_count = c.most_common(1)[0]
    second = c.most_common(2)[1]
    print(f"  pos {pos}: top byte 0x{top_byte:02x} ({100*top_count/len(bytes_at_pos):.2f}%), "
          f"second 0x{second[0]:02x} ({100*second[1]/len(bytes_at_pos):.2f}%)")

# Try various key lengths against the ICE-decrypted file:
# For each key length L, derive key bytes as most-common-byte per position mod L.
# Then XOR and check for PABR / Korean text.
print(f"\n=== Try XOR keys of various lengths against ICE-decrypted file ===")
for L in [8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 1024, 2048, 4096]:
    # For each position p in [0, L), find most common byte
    key = bytes(Counter(dec[i] for i in range(p, len(dec), L)).most_common(1)[0][0] for p in range(L))
    # Apply XOR
    xored = bytes(dec[i] ^ key[i % L] for i in range(len(dec)))
    # Check for PABR
    starts_pabr = xored[:4] == b'PABR'
    # Check Shannon entropy of XOR'd file
    e = shannon(xored)
    # Check for known strings
    pabr_count = xored.count(b'PABR')
    # Check for ASCII text
    ascii_count = sum(1 for b in xored[:10000] if 32 <= b < 127)
    # Check for Korean UTF-8 byte sequences
    korean_count = 0
    for i in range(min(10000, len(xored)-2)):
        if xored[i] == 0xEA and xored[i+1] >= 0xB0:
            korean_count += 1
    print(f"  L={L}: key[0:8]={key[:8].hex()}, entropy={e:.4f}, PABR@0={starts_pabr}, PABR_count={pabr_count}, ASCII_in_10k={ascii_count}, Korean_in_10k={korean_count}")

# Also try the raw file directly
print(f"\n=== Try XOR keys of various lengths against RAW file ===")
for L in [8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 1024, 2048, 4096]:
    key = bytes(Counter(raw[i] for i in range(p, len(raw), L)).most_common(1)[0][0] for p in range(L))
    xored = bytes(raw[i] ^ key[i % L] for i in range(len(raw)))
    e = shannon(xored)
    starts_pabr = xored[:4] == b'PABR'
    pabr_count = xored.count(b'PABR')
    ascii_count = sum(1 for b in xored[:10000] if 32 <= b < 127)
    korean_count = 0
    for i in range(min(10000, len(xored)-2)):
        if xored[i] == 0xEA and xored[i+1] >= 0xB0:
            korean_count += 1
    print(f"  L={L}: key[0:8]={key[:8].hex()}, entropy={e:.4f}, PABR@0={starts_pabr}, PABR_count={pabr_count}, ASCII_in_10k={ascii_count}, Korean_in_10k={korean_count}")

# Now check the offset index file for clues about the format
print(f"\n=== Look at offset index file structure ===")
offset_file = Path("/home/z/my-project/upload/commandtooltipoffset.dbss").read_bytes()
print(f"Offset file size: {len(offset_file)}")
print(f"First 64 bytes:")
print(f"  {offset_file[:64].hex()}")
print(f"  ASCII: {offset_file[:64]!r}")
# Each entry is 12 bytes. Look at columns.
import struct
count = struct.unpack('<I', offset_file[4:8])[0]
print(f"  Count@4 = {count}")
# Show first 10 entries
print(f"  First 10 entries (col0, col1, col2 as u32 LE):")
for i in range(10):
    off = 8 + i*12
    c0, c1, c2 = struct.unpack('<III', offset_file[off:off+12])
    print(f"    entry {i}: col0=0x{c0:08x}, col1={c1} (0x{c1:08x}), col2={c2} (0x{c2:08x})")
