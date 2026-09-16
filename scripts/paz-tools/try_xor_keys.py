#!/usr/bin/env python3
"""
Try XOR-ing the ICE-decrypted commandtooltip.dbss with various 8-byte keys
derived from the most-frequent plaintext block.
Theory: if records contain many zero-padding bytes, then the most-frequent
plaintext block IS the XOR key (zero XOR key = key).
"""
import struct
from collections import Counter
from pathlib import Path

DECRYPTED = Path("/tmp/cmdtt/cmdtt_ice_go_decrypted.bin")

def hexdump(b, n=64):
    out = []
    for i in range(0, min(n, len(b)), 16):
        chunk = b[i:i+16]
        hex_part = " ".join(f"{x:02x}" for x in chunk)
        ascii_part = "".join(chr(x) if 32 <= x < 127 else "." for x in chunk)
        out.append(f"{i:08x}  {hex_part:<48}  {ascii_part}")
    return "\n".join(out)

def U32(b, o): return struct.unpack('<I', b[o:o+4])[0]

data = DECRYPTED.read_bytes()

# Try XOR-ing with the most common 8-byte plaintext block (12182 occurrences)
key = bytes.fromhex("7ebb8e447aabca50")
xored = bytes(data[i] ^ key[i % 8] for i in range(min(256, len(data))))
print(f"XOR with key {key.hex()}:")
print(hexdump(xored, 128))
print(f"  ASCII: {xored[:128]!r}")
print()

# Also try the second-most common block
key2 = bytes.fromhex("0b1ae3de3eaf7dd7")
xored2 = bytes(data[i] ^ key2[i % 8] for i in range(min(256, len(data))))
print(f"XOR with key {key2.hex()}:")
print(hexdump(xored2, 128))
print()

# Look at where the most-common plaintext block first appears, and look at bytes around it
positions = []
start = 0
target = bytes.fromhex("7ebb8e447aabca50")
while True:
    i = data.find(target, start)
    if i == -1: break
    positions.append(i)
    start = i + 1
    if len(positions) >= 5: break

print("=== Context around first occurrences of 7ebb8e447aabca50 ===")
for p in positions:
    # Show 32 bytes before and 40 bytes after
    ctx_start = max(0, p-32)
    ctx_end = min(len(data), p+48)
    chunk = data[ctx_start:ctx_end]
    print(f"\n@{p}: (showing {ctx_start}..{ctx_end})")
    print(hexdump(chunk, len(chunk)))

# Check what byte sequence APPEARS MOST OFTEN right BEFORE the top repeating block
# This might give us the record header structure
print("\n=== Common byte prefix BEFORE the repeating block ===")
# Look at 4 bytes before each occurrence of the block
prefixes = Counter()
for p in positions:
    if p >= 4:
        prefix = bytes(data[p-4:p])
        prefixes[prefix] += 1
for pfx, c in prefixes.most_common(5):
    print(f"  {pfx.hex()}: {c}")

# Look at first 16 bytes of each occurrence's surrounding context (8 bytes before, 8 after = the block itself, 8 after)
print("\n=== Common pattern around the repeating block (8 bytes before, 8 after) ===")
ctxs = Counter()
for p in positions:
    if p >= 8 and p+16 <= len(data):
        ctx = bytes(data[p-8:p+16])  # 24 bytes
        ctxs[ctx] += 1
        if len(ctxs) > 100: break
for ctx, c in ctxs.most_common(5):
    print(f"  {ctx.hex()}: {c}")

# Look at the file structure assuming records are 36 bytes (the minimum)
# Maybe each 36-byte "padding" record is just the same 8-byte block 4.5 times = 36 bytes
# Let's see if the 7663 records have a 36-byte sub-record at the start
print("\n=== Records of size 36 — analyze structure ===")
import json
entries = json.loads(Path("/tmp/cmdtt/offset_entries.json").read_text())
size36 = [e for e in entries if e['size'] == 36]
print(f"  {len(size36)} records of size 36")
print(f"  First 5 such records (decrypted):")
for e in size36[:5]:
    rec = data[e['offset']:e['offset']+e['size']]
    print(f"  key=0x{e['key']:08x} offset={e['offset']}: {rec.hex()}")
# Check if the 36-byte records all share the same content (modulo first 4 bytes)
print("\n  Decrypted bytes 4..36 of the first 5 size-36 records (i.e., excluding first 4 bytes):")
for e in size36[:5]:
    rec = data[e['offset']:e['offset']+e['size']]
    print(f"    key=0x{e['key']:08x}: {rec[4:].hex()}")

# Try: what if the records aren't encrypted, but the FILE has a different cipher?
# Try just XOR-ing the RAW file with various keys
print("\n=== Try: XOR raw file with various keys ===")
raw = Path("/home/z/my-project/upload/commandtooltip.dbss").read_bytes()
# First 8 bytes XOR with "PABR"+count: count = 7663 = 0x1def
key_pabr_count = bytes(raw[i]^b for i,b in enumerate(b"PABR\xef\x1d\x00\x00"))
print(f"  Key for 'PABR'+7663-as-count: {key_pabr_count.hex()}")
dec1 = bytes(raw[i]^key_pabr_count[i%8] for i in range(64))
print(f"  Decrypted first 64 bytes: {dec1.hex()}")
print(f"  ASCII: {dec1!r}")

# What if the cipher is actually a STREAM cipher like ChaCha20 with the ICE key?
# Or AES-CTR with the ICE key?
# Or what if we need to look at the file more carefully — maybe the records have a different structure

# Let me look at the bytes at the start of the file (before record 0 at offset 4)
print(f"\n=== First 8 bytes of decrypted file ===")
print(f"  hex: {data[:8].hex()}")
print(f"  ASCII: {data[:8]!r}")
# Maybe the first 4 bytes are a u32 record count, just like PABR but without the PABR magic
print(f"  As u32 LE: {U32(data, 0)}")
print(f"  As u32 BE: {struct.unpack('>I', data[:4])[0]}")
# 7663 = 0x1def
# 0xfc2b62cd and 0xcd622bfc — neither is 7663

# What if the first 8 bytes are an encrypted (PABR + count)?
# Encrypt "PABR" + 4 zero bytes with ICE → 2f5848497263d47e
# Encrypt "PABR" + 7663-as-u32-LE = "PABR\xef\x1d\x00\x00" → ?
# Let me check this with my Go binary's test vectors.
# Go said: encrypt "PABR\x00\x00\x00\x00" -> 2f5848497263d47e
# What's "PABR" + count@LE? Let me compute it via Go. For now, let's see:
# The actual decrypted file starts with cd622bfc — that's NOT "PABR" + something
# So decryption is producing the wrong output.

# Try: what if the first 4 bytes of the file are an UNENCRYPTED header (e.g., u32 count)?
# Then the encrypted data starts at offset 4.
print(f"\n=== Hypothesis: 4-byte unencrypted header, then encrypted body ===")
print(f"  Raw bytes 0-4: {raw[:4].hex()} = u32 LE = {U32(raw, 0)} = 0x{U32(raw,0):08x}")
# 0xa35c063a = 2740187194 — doesn't look like a count
# But maybe it's a header marker?

# What if the offset index is wrong about offset=4? Maybe the offset values point to positions
# in the RAW (encrypted) file, not decrypted. So record 0 in the RAW file starts at byte 4.
# Then to decrypt, we need to skip the first 4 bytes (header), decrypt the rest.
# But ICE needs the file to be 8-byte aligned. 3864952 - 4 = 3864948, which is divisible by 4 but
# not by 8 (3864948 / 8 = 483118.5). So we can't ICE-decrypt the body starting at offset 4.
# Unless the actual records have a header that's 8 bytes (4 byte PABR-less header + 4 byte count).
print(f"  (len(raw) - 4) % 8 = {(len(raw) - 4) % 8}")
print(f"  (len(raw) - 8) % 8 = {(len(raw) - 8) % 8}")

# Let me try: maybe the first 8 bytes of the file are an 8-byte header (not encrypted),
# and the body starts at offset 8. Then the body is 3864944 bytes, divisible by 8.
# But the offset index says record 0 starts at offset 4... so that doesn't quite fit.

# What if the first 4 bytes are an unencrypted header (some kind of magic) and the offset
# index points to byte offsets INCLUDING the 4-byte header? Then record 0 is at raw offset 4.
# Decrypt the whole file from offset 0, but the first 4 bytes are unencrypted — what does
# ICE do to them? They get treated as part of block 0 (bytes 0-7).
# So the decrypted block 0 = ICE_decrypt(raw[0:8]) = cd622bfc7fe9c8a4.
# But the first 4 bytes were UNENCRYPTED plaintext = 0xa35c063a. So if the decryption is
# producing cd622bfc, that means the actual PLAINTEXT block 0 was something different.

# Try: decrypt only from offset 8 onwards, treating offset 0-7 as unencrypted header
# If we ICE-decrypt raw[8:] and it gives PABR-like content...
# raw[8:] = ad169f0b8a2e6e8c32ee0d606e9c5a64...
# ICE_decrypt(ad169f0b8a2e6e8c) = ?
# Use Go for this — but let's see if any 8-byte alignment works.

print(f"\n=== Try various offset alignments for ICE decryption ===")
# Try decrypting from byte offset N (where N is multiple of 8) and check first 8 bytes
# Need to use the Go binary for ICE decryption
for skip in [0, 4, 8, 16, 32, 64]:
    body = raw[skip:]
    # Pad to multiple of 8
    body = body[:len(body) - (len(body) % 8)]
    # We can use the Go binary — but for now just print sizes
    print(f"  Skip {skip}: body size = {len(body)} ({len(body) % 8})")
