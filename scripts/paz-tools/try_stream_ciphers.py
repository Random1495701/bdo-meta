#!/usr/bin/env python3
"""
Try XOR with longer-period keys. The most common 16-byte block in the encrypted
file is ed922230b4f45a35f02b93ec856d3c3c (4351 occurrences).
If the cipher is XOR with 16-byte periodic key and plaintext is mostly zeros,
then K = top 16-byte block. Test this.
Also try 24, 32, 64-byte periods.
"""
import struct
import math
from collections import Counter
from pathlib import Path

RAW = Path("/home/z/my-project/upload/commandtooltip.dbss")
raw = RAW.read_bytes()

def shannon(data):
    if not data: return 0.0
    freq = Counter(data)
    n = len(data)
    h = 0.0
    for c in freq.values():
        p = c / n
        h -= p * math.log2(p)
    return h

# Find top N-byte blocks for various N
print("=== Most common N-byte blocks for various N ===")
for N in [8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 1024, 2048, 4096]:
    blocks = Counter()
    for i in range(0, len(raw)-N, N):
        blocks[bytes(raw[i:i+N])] += 1
    if not blocks:
        continue
    top_block, top_count = blocks.most_common(1)[0]
    print(f"  N={N}: top block {top_block.hex()[:64]}{'...' if N > 32 else ''} ({top_count} occurrences)")

# Try XOR with each top block as a repeating key
print("\n=== Try XOR with top N-byte block as repeating key ===")
for N in [8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512]:
    blocks = Counter()
    for i in range(0, len(raw)-N, N):
        blocks[bytes(raw[i:i+N])] += 1
    if not blocks:
        continue
    top_block, _ = blocks.most_common(1)[0]
    # XOR with this key
    xored = bytes(raw[i] ^ top_block[i % N] for i in range(min(64, len(raw))))
    starts_pabr = xored[:4] == b'PABR'
    e = shannon(bytes(raw[i] ^ top_block[i % N] for i in range(len(raw))))
    pabr_count = bytes(raw[i] ^ top_block[i % N] for i in range(len(raw))).count(b'PABR')
    print(f"  N={N}: key={top_block.hex()[:32]}{'...' if N > 16 else ''}, PABR@0={starts_pabr}, entropy={e:.4f}, PABR_count={pabr_count}")
    if starts_pabr:
        print(f"    First 64 bytes: {xored.hex()}")
        print(f"    ASCII: {xored!r}")

# Maybe the key is derived from the BDO ICE key somehow
# Let's try: maybe the file uses ChaCha20 or Salsa20 with the BDO key (8 bytes -> padded to 32)
print("\n=== Try ChaCha20/Salsa20/RC4 with BDO key ===")
from Crypto.Cipher import ChaCha20, Salsa20, ARC4
bdo_key = bytes([0x51, 0xF3, 0x0F, 0x11, 0x04, 0x24, 0x6A, 0x00])

# RC4 with BDO key
for key in [bdo_key, bdo_key + bdo_key, bdo_key + b'\x00' * 8, bdo_key + b'\xff' * 8, bdo_key * 2]:
    cipher = ARC4.new(key)
    dec = cipher.decrypt(raw)
    starts_pabr = dec[:4] == b'PABR'
    pabr_count = dec.count(b'PABR')
    e = shannon(dec)
    print(f"  RC4 key={key.hex()}: PABR@0={starts_pabr}, PABR_count={pabr_count}, entropy={e:.4f}")
    if starts_pabr or pabr_count > 0:
        print(f"    First 32 bytes: {dec[:32].hex()}")
        print(f"    ASCII: {dec[:32]!r}")

# ChaCha20 with BDO key (padded) and various nonces
print("\n=== Try ChaCha20 with BDO key (padded) + various nonces ===")
chacha_keys = [
    bdo_key + b'\x00' * 24,  # 32 bytes
    bdo_key * 4,  # 32 bytes
    bdo_key + bdo_key + bdo_key + bdo_key,  # 32 bytes
]
nonces = [
    b'\x00' * 8,
    b'\x00' * 12,
    bdo_key,  # use BDO key as nonce
    b'\x01' * 8,
]
for i, key in enumerate(chacha_keys):
    for nonce in nonces:
        try:
            if len(nonce) == 8:
                cipher = ChaCha20.new(key=key, nonce=nonce)
            else:
                cipher = ChaCha20.new(key=key, nonce=nonce)
            dec = cipher.decrypt(raw)
            starts_pabr = dec[:4] == b'PABR'
            pabr_count = dec.count(b'PABR')
            if starts_pabr or pabr_count > 5:
                print(f"  ChaCha20 key_idx={i} nonce={nonce.hex()}: PABR@0={starts_pabr}, PABR_count={pabr_count}")
                print(f"    First 32 bytes: {dec[:32].hex()}")
                print(f"    ASCII: {dec[:32]!r}")
        except Exception as e:
            print(f"  ChaCha20 key_idx={i} nonce={nonce.hex()}: error {e}")

# Salsa20
print("\n=== Try Salsa20 with BDO key (padded) ===")
for i, key in enumerate(chacha_keys[:2]):
    for nonce in nonces[:2]:
        try:
            cipher = Salsa20.new(key=key, nonce=nonce)
            dec = cipher.decrypt(raw)
            starts_pabr = dec[:4] == b'PABR'
            pabr_count = dec.count(b'PABR')
            if starts_pabr or pabr_count > 5:
                print(f"  Salsa20 key_idx={i} nonce={nonce.hex()}: PABR@0={starts_pabr}, PABR_count={pabr_count}")
                print(f"    First 32 bytes: {dec[:32].hex()}")
                print(f"    ASCII: {dec[:32]!r}")
        except Exception as e:
            pass

# Try AES-CTR with BDO key
print("\n=== Try AES-CTR with BDO key (padded to 16 bytes) ===")
from Crypto.Cipher import AES
aes_keys = [
    bdo_key + b'\x00' * 8,  # 16 bytes
    bdo_key * 2,  # 16 bytes
    bdo_key + bdo_key[::-1],  # 16 bytes
]
nonces_ctr = [
    b'\x00' * 8,
    b'\x01' * 8,
    bdo_key,
]
for i, key in enumerate(aes_keys):
    for nonce in nonces_ctr:
        try:
            cipher = AES.new(key, AES.MODE_CTR, nonce=nonce, initial_value=0)
            dec = cipher.decrypt(raw)
            starts_pabr = dec[:4] == b'PABR'
            pabr_count = dec.count(b'PABR')
            if starts_pabr or pabr_count > 5:
                print(f"  AES-CTR key_idx={i} nonce={nonce.hex()}: PABR@0={starts_pabr}, PABR_count={pabr_count}")
                print(f"    First 32 bytes: {dec[:32].hex()}")
                print(f"    ASCII: {dec[:32]!r}")
        except Exception as e:
            pass

# Try AES-ECB with BDO key (16 bytes)
print("\n=== Try AES-ECB with BDO key (16 bytes) ===")
# AES requires 16, 24, or 32-byte keys. Pad BDO key to 16.
for i, key in enumerate(aes_keys):
    try:
        cipher = AES.new(key, AES.MODE_ECB)
        # AES blocks are 16 bytes, file is 3864952 bytes, not divisible by 16
        # Pad with zeros to multiple of 16
        padded = raw + b'\x00' * (16 - (len(raw) % 16))
        dec = cipher.decrypt(padded)
        starts_pabr = dec[:4] == b'PABR'
        pabr_count = dec.count(b'PABR')
        print(f"  AES-ECB key_idx={i}: PABR@0={starts_pabr}, PABR_count={pabr_count}")
        if starts_pabr:
            print(f"    First 32 bytes: {dec[:32].hex()}")
    except Exception as e:
        print(f"  AES-ECB key_idx={i}: error {e}")
