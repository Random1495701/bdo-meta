#!/usr/bin/env python3
"""
Try XOR'ing the ICE-decrypted file with the top N-byte block (as repeating key)
for various N. If cipher is ICE+XOR(K2), then XOR'ing ICE_decrypt(C) with K2 gives P.
If plaintext is mostly zeros at certain positions, then top N-byte block in ICE_decrypt(C) = K2.
"""
import struct
import math
from collections import Counter
from pathlib import Path

DEC = Path("/tmp/cmdtt/cmdtt_ice_go_decrypted.bin")
dec = DEC.read_bytes()

def shannon(data):
    if not data: return 0.0
    freq = Counter(data)
    n = len(data)
    h = 0.0
    for c in freq.values():
        p = c / n
        h -= p * math.log2(p)
    return h

# Find top N-byte block in ICE-decrypted file
print("=== Top N-byte blocks in ICE-decrypted file ===")
top_blocks = {}
for N in [8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 1024, 2048, 4096]:
    blocks = Counter()
    for i in range(0, len(dec)-N, N):
        blocks[bytes(dec[i:i+N])] += 1
    if blocks:
        top_block, top_count = blocks.most_common(1)[0]
        top_blocks[N] = top_block
        print(f"  N={N}: top block {top_block.hex()[:64]}{'...' if N > 32 else ''} ({top_count} occurrences)")

print("\n=== Try XOR ICE-decrypted with top N-byte block as repeating key ===")
for N in [8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 1024, 2048, 4096]:
    if N not in top_blocks: continue
    key = top_blocks[N]
    xored = bytes(dec[i] ^ key[i % N] for i in range(min(128, len(dec))))
    starts_pabr = xored[:4] == b'PABR'
    full_xored = bytes(dec[i] ^ key[i % N] for i in range(len(dec)))
    e = shannon(full_xored)
    pabr_count = full_xored.count(b'PABR')
    # Check for korean UTF-8 sequences in first 10000 bytes
    korean_count = 0
    for i in range(min(10000, len(full_xored)-2)):
        if 0xEA <= full_xored[i] <= 0xED and full_xored[i+1] >= 0xB0:
            korean_count += 1
    # Check ASCII text
    ascii_count = sum(1 for b in full_xored[:10000] if 32 <= b < 127)
    print(f"  N={N}: PABR@0={starts_pabr}, PABR_count={pabr_count}, entropy={e:.4f}, ASCII_10k={ascii_count}, Korean_10k={korean_count}")
    if starts_pabr or pabr_count > 5:
        print(f"    First 64 bytes: {xored[:64].hex()}")
        print(f"    ASCII: {xored[:64]!r}")

# Maybe try: derive a longer key assuming first N bytes are PABR + count + zeros
print("\n=== Derive longer K2 by assuming first N bytes of plaintext ===")
# If P[0:8] = "PABR" + 7663 = 50414252ef1d0000
# If P[0:16] = PABR + count + 8 more bytes — what could those 8 bytes be?
# Maybe the next 8 bytes are a u64 string table pointer? Or zeros?
# For a PABR file, after PABR+count, the next bytes are the first record's data.
# We don't know what that is.

# But maybe the file has a different structure: PABR + count + u64 string_table_offset at end
# Actually wait — let me check tooltiptable.dbss's structure for comparison

tt = Path("/home/z/my-project/upload/tooltiptable.dbss").read_bytes()
print(f"  tooltiptable.dbss first 16 bytes: {tt[:16].hex()}")
print(f"  tooltiptable.dbss ASCII: {tt[:16]!r}")
# PABR + count(3244) + first record's first 8 bytes
# Looking at: 50414252ac0c0000 9000 81b7 0000 0000 — hmm count is 0x0cac = 3244 ✓
# Then bytes 8-15 = 90 81 98 b7 00 00 00 00 — that's the first record's first 8 bytes
# Looking at the structure: 90 81 98 b7 = u32 LE = 0xb7988190 (a hash) followed by 4 zeros

# If commandtooltip.dbss has the same structure (PABR + count + record_hash + zeros...),
# then we can derive K2 of length 16 assuming P[0:16] = PABR + count + something + zeros
# Let's try: P[0:16] = "PABR" + count + first record hash + 4 zeros
# But we don't know the first record hash.

# Actually, let me try this: maybe the first 16 bytes of P are PABR + count(7663) + 8 zeros
# (some files have padding after the header)
plain16 = b'PABR' + struct.pack('<I', 7663) + b'\x00' * 8
print(f"\n  Assuming P[0:16] = {plain16.hex()}")
# ICE_encrypt this with BDO key
# But I need Go for ICE. Let me use my Python port instead.
# Actually, since we're decrypting the file, let me use the relationship:
#   C XOR K2 = ICE_encrypt(P)
# So K2 = C XOR ICE_encrypt(P)
# We need ICE_encrypt(P[0:16])
# Use the Go binary for this

# Actually, let me try with Python — using my ICE port
# I can't trust my Python port (it gave wrong test vectors). Let me use Go.

# Strategy: compute ICE_encrypt(P[0:N]) in Go, then XOR with C[0:N] to get K2[0:N]
# Then check if K2 is periodic with some period.
print("  Will use Go to compute ICE_encrypt of various plaintexts and derive K2 lengths.")

# Actually, let me try the simplest: assume P[0:16] = PABR + count + 8 zeros
# Use the Go binary to ICE_encrypt this
import subprocess
result = subprocess.run(['/tmp/cmdtt/ice_xor', '/dev/stdin'], input=plain16, capture_output=True)
# Hmm, the ice_xor binary takes a file, not stdin. Let me write a temp file.
Path("/tmp/cmdtt/plain16.bin").write_bytes(plain16)
# Now I need to use Go to encrypt this. Let me write a new Go program.
print("  Wrote plain16.bin. Need Go to encrypt this with ICE.")

# Actually, easier: let me modify the approach. Use the standalone ice_driver Go program
# which already encrypts a known plaintext and prints the result.
# But it doesn't accept arbitrary plaintext. Let me create a new Go driver.

# Actually, let me think more carefully. The cipher is C = ICE_encrypt(P) XOR K2.
# To derive K2[0:N], we need:
#   K2[0:N] = C[0:N] XOR ICE_encrypt(P[0:N])
# ICE works on 8-byte blocks. So ICE_encrypt(P[0:N]) requires N to be a multiple of 8.
# For N=8, we already derived K2[0:8] = 0c8a67b72a310f10 (assuming P[0:8] = PABR+7663).
# For N=16, we need to assume P[0:16].

# Let me try several assumptions for P[0:16]:
candidates = [
    (b"PABR" + struct.pack('<I', 7663) + b'\x00' * 8, "PABR+count+8zeros"),
    (b"PABR" + struct.pack('<I', 7663) + b'\xff' * 8, "PABR+count+8FF"),
    (b"PABR" + struct.pack('<I', 7663) + b'PABR' + struct.pack('<I', 7663), "PABR+count+PABR+count"),
    (b"PABR" + struct.pack('<I', 7663) + b'\x00' * 4 + struct.pack('<I', 7663), "PABR+count+0+count"),
]
for plain16, label in candidates:
    print(f"\n  Trying assumption: {label}")
    print(f"    Plaintext: {plain16.hex()}")
    # Write to file and run Go to ICE-encrypt
    Path("/tmp/cmdtt/plain16.bin").write_bytes(plain16)
    # Need a Go program that takes a plaintext file and outputs the ICE encryption
    # Actually, I'll write one inline. For now, let me skip and use my Python port
    # despite knowing it has bugs. The derived K2 will be wrong, but the SHAPE
    # of K2 might still be informative.

# Actually, I have a better idea. Let me compute ICE_encrypt of these candidates using Go.
# I'll write a new Go program that takes a plaintext file and ICE-encrypts it.
