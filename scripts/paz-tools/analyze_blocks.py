#!/usr/bin/env python3
"""
Investigate the repeating 8-byte blocks in commandtooltip.dbss.
Theory: maybe XOR with repeating key (crackable), or maybe block cipher ECB.
"""
import collections
from pathlib import Path

TARGET = Path("/home/z/my-project/upload/commandtooltip.dbss")
data = TARGET.read_bytes()

print("=== Repeating 8-byte block analysis ===")
# Find positions of top repeating blocks
top_blocks = [
    bytes.fromhex("0619e4769559b1fd"),
    bytes.fromhex("d1130fc7db36445c"),
    bytes.fromhex("b4bcb483c8da1871"),
    bytes.fromhex("54d5ff4765befc18"),
]

for blk in top_blocks:
    positions = []
    start = 0
    while True:
        i = data.find(blk, start)
        if i == -1:
            break
        positions.append(i)
        start = i + 1
        if len(positions) > 20: break
    print(f"\nBlock {blk.hex()}: {len(positions)}+ positions")
    print(f"  First 20 positions: {positions[:20]}")
    if len(positions) > 1:
        diffs = [positions[i+1]-positions[i] for i in range(min(15, len(positions)-1))]
        print(f"  Consecutive diffs: {diffs}")
        # GCD of diffs
        from math import gcd
        from functools import reduce
        g = reduce(gcd, diffs)
        print(f"  GCD of diffs: {g}")

print("\n=== Period detection (autocorrelation) ===")
# For each candidate period P, count matches data[i] == data[i+P]
for P in [8, 16, 24, 32, 40, 48, 56, 64, 96, 128, 192, 256, 384, 512, 1024, 2048, 4096]:
    matches = 0
    total = 0
    for i in range(0, len(data)-P, 8):  # check 8-byte aligned
        for j in range(P):
            if i+j+P < len(data):
                total += 1
                if data[i+j] == data[i+j+P]:
                    matches += 1
        if total > 1_000_000:
            break
    print(f"  Period {P}: matches={matches}/{total} ({100*matches/total:.2f}%)")

print("\n=== Try XOR with simple repeating 8-byte keys ===")
# If file is XOR-encrypted with an 8-byte repeating key, then the most common 8-byte block
# in ciphertext corresponds to the most common 8-byte plaintext block XORed with the key.
# 
# For BDO skill data, the most common plaintext 8-byte block is probably all-zeros (0x0000000000000000)
# which appears often in padding. If so, the most common ciphertext block IS the key!
candidate_keys = [
    bytes.fromhex("0619e4769559b1fd"),  # most common block — maybe IS the key if plaintext is mostly zeros
    bytes.fromhex("d1130fc7db36445c"),
    bytes.fromhex("b4bcb483c8da1871"),
    bytes.fromhex("54d5ff4765befc18"),
]
for key in candidate_keys:
    decrypted = bytes(data[i] ^ key[i % 8] for i in range(min(64, len(data))))
    print(f"\nKey {key.hex()}: first 64 decrypted bytes:")
    print(f"  {decrypted.hex()}")
    print(f"  ASCII: {decrypted!r}")

# Maybe XOR with longer repeating key derived from the file's structure?
# Try various key lengths and check if decryption yields PABR or Korean text
print("\n=== Brute-force XOR key lengths to find PABR header ===")
# If we XOR data[0:4] with key[0:4] = "PABR", we get the first 4 key bytes
import struct
target_magic = b"PABR"
# So key[0:4] = data[0:4] XOR "PABR"
key_start = bytes(data[i] ^ target_magic[i] for i in range(4))
print(f"  If first 4 bytes are 'PABR' XOR'd: key[0:4] = {key_start.hex()} = {key_start!r}")
# Also try with the offset file's count interpretation:
# tooltiptable.dbss: "PABR" + u32 count + ...
# commandtooltip.dbss may have similar: "PABR" + u32 count + ...
# data[0:8] = 3a 06 5c a3 c2 0e 15 9e
# If [0:4] = "PABR" → key[0:4] = key_start (above)
# Then data[4:8] is u32 count after PABR. For ~7663 records, count might be ~7663..7000ish
# 0xa35c063a = 2740187194 (way too big)
# Maybe count is at offset 4 and is small. Try: data[4:8] = c2 0e 15 9e = u32 LE = 0x9e150ec2 = 2652118610
# Way too big. So count is NOT at offset 4 directly.
# What if there's a length prefix?
# Maybe the format is different — e.g., [u32 magic][u32 size][u32 count][...]
# Let's see what XOR key would make bytes [4:8] look like a count.
# A reasonable count for commandtooltip records would be 7000-10000.
# If count is at offset 4, data[4:8] XOR key[4:8] = count
# Try: count = 7663 = 0x1def → key[4:8] = data[4:8] XOR 0x1def (little endian) = ef 1d 00 00
# That would mean key[4:8] = c2^ef, 0e^1d, 15^00, 9e^00 = 2d, 13, 15, 9e
key4_count = bytes([data[4]^0xef, data[5]^0x1d, data[6]^0x00, data[7]^0x00])
print(f"  If count@4 = 0x1def (7663), key[4:8] = {key4_count.hex()}")
# Try various plausible counts
for count in [7663, 7671, 7000, 8000, 10000, 12000, 5000, 6000, 4355, 2304, 3044, 3000]:
    key4 = bytes([data[4]^c, data[5]^(c>>8), data[6]^(c>>16), data[7]^(c>>24)] for c in [count])[0]
    # simpler:
    key4 = bytes([data[4]^(count & 0xff), data[5]^((count>>8)&0xff), data[6]^((count>>16)&0xff), data[7]^((count>>24)&0xff)])
    print(f"  count@4={count}: key[4:8]={key4.hex()}")

print("\n=== Try: maybe data starts with count, not PABR ===")
# What if the file is structured like: [u32 count][data] and the data is XOR'd?
# Then data[0:4] could be a u32 count directly, and data[4:8] is the start of real records
# tooltiptableoffset.dbss has "PABR" + count + ... = 4+4 = 8 byte header
# Maybe commandtooltip.dbss has just count (no PABR magic) at start = 4-byte header
# Then real data starts at offset 4
# Let's check: if header is 4 bytes, what's the count?
import struct as st
print(f"  data[0:4] as u32 LE: {st.unpack('<I', data[:4])[0]} = 0x{st.unpack('<I', data[:4])[0]:08x}")
print(f"  data[0:4] as u32 BE: {st.unpack('>I', data[:4])[0]} = 0x{st.unpack('>I', data[:4])[0]:08x}")

# Try XOR with first 4 bytes treated as count (e.g. 7663 little endian)
# If header is u32 count = 7663 (0x1def) XOR'd, key[0:4] = data[0:4] XOR 0xef1d0000
key_test = bytes([data[0]^0xef, data[1]^0x1d, data[2]^0x00, data[3]^0x00])
print(f"  If count@0=7663, key[0:4]={key_test.hex()}")

# What if file format is: [u32 something][u32 something][real PABR-formatted data XOR'd with key]
# Then PABR magic might be at offset 8
print(f"\n  data[8:12] = {data[8:12].hex()} = ASCII {data[8:12]!r}")
print(f"  If data[8:12] is 'PABR' XOR'd, key[8:12] = {bytes(data[8+i]^ord('PABR'[i]) for i in range(4)).hex()}")
print(f"  data[16:20] = {data[16:20].hex()}")
print(f"  If data[16:20] is 'PABR' XOR'd, key[16:20] = {bytes(data[16+i]^ord('PABR'[i]) for i in range(4)).hex()}")

# Check key bytes if data starts at offset 0 with PABR XOR'd with repeating 8-byte key:
# key = data[0:4] XOR "PABR" = 3a065ca3 XOR 50414252 = 6a470ef1 ... wait that's 4 bytes only
# We need an 8-byte key. So key[0:4] = data[0:4] XOR "PABR", key[4:8] = data[4:8] XOR ?
# Let's say bytes 4-7 of plaintext are u32 count of records.
# The offset file has 7663 records, so commandtooltip.dbss likely has same number.
# count = 7663 = 0x1def → as bytes LE: ef 1d 00 00
# key[4:8] = data[4:8] XOR "ef 1d 00 00"
key4 = bytes([data[4]^0xef, data[5]^0x1d, data[6]^0x00, data[7]^0x00])
key8 = bytes([data[0]^ord('P'), data[1]^ord('A'), data[2]^ord('B'), data[3]^ord('R'),
              data[4]^0xef, data[5]^0x1d, data[6]^0x00, data[7]^0x00])
print(f"\n  Key candidate if [0:4]='PABR', [4:8]=7663 count: {key8.hex()}")
# Apply this key to first 256 bytes
decrypted = bytes(data[i] ^ key8[i % 8] for i in range(256))
print(f"  Decrypted first 64 bytes:")
print(f"    {decrypted[:64].hex()}")
print(f"    ASCII: {decrypted[:64]!r}")

# Try with count = number of records from offset file (parse offset file first)
import struct as st
offset_file = Path("/home/z/my-project/upload/commandtooltipoffset.dbss").read_bytes()
print(f"\n  Offset file first 16: {offset_file[:16].hex()}")
print(f"  Offset file [0:4] = {offset_file[:4]!r}")
off_count = st.unpack('<I', offset_file[4:8])[0]
print(f"  Offset file count@4 = {off_count}")

# Apply different counts
for cnt in [off_count, off_count-1, off_count+1, 0]:
    key8 = bytes([data[0]^ord('P'), data[1]^ord('A'), data[2]^ord('B'), data[3]^ord('R'),
                  data[4]^(cnt&0xff), data[5]^((cnt>>8)&0xff), data[6]^((cnt>>16)&0xff), data[7]^((cnt>>24)&0xff)])
    decrypted = bytes(data[i] ^ key8[i % 8] for i in range(64))
    print(f"  count@4={cnt}: key={key8.hex()}, decrypted[0:16]={decrypted[:16].hex()} ASCII={decrypted[:16]!r}")
