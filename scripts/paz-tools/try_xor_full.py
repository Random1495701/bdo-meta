#!/usr/bin/env python3
"""
Apply the derived XOR key (6a471ef12d13159e) to the entire raw file.
Check if the result is meaningful: PABR header, Korean text, etc.
Also try ICE-decrypting first, THEN XOR-ing.
"""
import struct
import math
from collections import Counter
from pathlib import Path

RAW = Path("/home/z/my-project/upload/commandtooltip.dbss")
ICE_DEC = Path("/tmp/cmdtt/cmdtt_ice_go_decrypted.bin")

def hexdump(b, n=64):
    out = []
    for i in range(0, min(n, len(b)), 16):
        chunk = b[i:i+16]
        hex_part = " ".join(f"{x:02x}" for x in chunk)
        ascii_part = "".join(chr(x) if 32 <= x < 127 else "." for x in chunk)
        out.append(f"{i:08x}  {hex_part:<48}  {ascii_part}")
    return "\n".join(out)

def shannon(data):
    if not data:
        return 0.0
    freq = Counter(data)
    n = len(data)
    h = 0.0
    for c in freq.values():
        p = c / n
        h -= p * math.log2(p)
    return h

raw = RAW.read_bytes()
dec = ICE_DEC.read_bytes()

# 1) XOR raw with derived key, check entire file
key = bytes.fromhex("6a471ef12d13159e")
xored = bytes(raw[i] ^ key[i % 8] for i in range(len(raw)))
print(f"=== Approach 1: XOR raw file with key {key.hex()} ===")
print(f"First 64 bytes:")
print(hexdump(xored[:64]))
print(f"First 256 bytes ASCII: {xored[:256]!r}")
print(f"Shannon entropy of XOR'd file: {shannon(xored):.4f}")
print(f"Contains PABR: {b'PABR' in xored}")
print(f"PABR at start: {xored[:4] == b'PABR'}")
print()

# 2) XOR ICE-decrypted with derived key
xored2 = bytes(dec[i] ^ key[i % 8] for i in range(len(dec)))
print(f"=== Approach 2: XOR ICE-decrypted file with key {key.hex()} ===")
print(f"First 64 bytes:")
print(hexdump(xored2[:64]))
print(f"Shannon entropy: {shannon(xored2):.4f}")
print(f"Contains PABR: {b'PABR' in xored2}")
print()

# 3) Maybe the XOR key isn't 8 bytes — try deriving longer keys
# If we assume the file starts with "PABR" + count + records, then we know the first 8 bytes.
# But we don't know bytes 8+. However, maybe records' start with a fixed magic.
# Let's check the offset index — does it have a known structure?
# Actually let me try assuming the file starts with the offset index's first entry:
# "PABR" + count + first record (key + offset + size)?  No, that doesn't make sense.
# 
# What if the data file starts with "PABR" + count(7663) + actual records?
# Then bytes 0-3 = PABR, bytes 4-7 = count(7663), bytes 8+ = first record.
# First record (per offset index) is at offset 4, size 92. But wait, that doesn't match
# "PABR" being at offset 0-3.
# 
# Maybe the offset index points to positions WITHIN the unencrypted data, but the data
# is encrypted. So record 0 is at decrypted offset 4.
# If decrypted data starts with "PABR" + count + records, then:
#   decrypted[0:4] = "PABR"
#   decrypted[4:8] = count(7663)
#   decrypted[8:] = records
# But the offset index says record 0 starts at offset 4!
# So either:
#   (a) the offset index skips the PABR magic (offset 4 = after PABR+count = bytes 8+)? No, 4 ≠ 8
#   (b) the offset index points to records within a non-PABR file (no PABR magic at start)
# 
# Looking at commandtooltipoffset.dbss which IS PABR-formatted:
#   - Starts with "PABR" + count(7663) + offset entries
# 
# Looking at the data file's offset index entry 0: offset=4. So record 0 starts at byte 4.
# If the data file were PABR-formatted, record 0 would start at byte 8 (after PABR + count).
# Since it starts at byte 4, the data file has a 4-byte header (not 8-byte PABR header).
# 
# So the data file format is: [4-byte header] + [7663 records]
# The 4-byte header is... what? Maybe a u32 count? Or a magic number?
# 
# If the 4-byte header is u32 count, then count = decrypted[0:4] LE = 0xfc2b62cd = 4230701773
# That's way too big.
# 
# If the 4-byte header is u32 count of records (7663), then:
#   decrypted[0:4] should be 0x1def = bytes ef 1d 00 00
# But it's cd 62 2b fc. Doesn't match.
# 
# So either:
#   - The 4-byte header is something other than a count
#   - OR the data is encrypted (which we already know)
# 
# Let me check: if the data is ICE-encrypted, then ICE_decrypt(encrypted) = decrypted
# But the decrypted first 4 bytes are cd 62 2b fc — doesn't look like a count or magic.
# 
# So either:
#   - The cipher is NOT ICE (the file uses a different cipher)
#   - OR the cipher IS ICE but with a different key
#   - OR the data is doubly-encrypted (ICE + something else)

# 4) Try: maybe the file uses a DIFFERENT 8-byte ICE key
# We know the file's first 8 bytes encrypted are 3a 06 5c a3 c2 0e 15 9e
# If the plaintext starts with "PABR" + 4 zeros, then:
#   ICE_encrypt("PABR\x00\x00\x00\x00") = ?
# We tested with Go: result = 2f5848497263d47e
# But the file starts with 3a065ca3c20e159e. Different. So the plaintext is NOT "PABR"+4 zeros with BDO key.

# 5) Maybe the file is encrypted with a STREAM cipher (e.g., ChaCha20)
# Or with AES-CTR, etc.

# 6) Maybe the file is encrypted with a 16-byte XOR key derived from some pattern
# Let me derive 16 bytes assuming the first 16 plaintext bytes are "PABR" + count + first record's first 8 bytes
# But we don't know what the first record's first 8 bytes are.

# Let's check if maybe the plaintext starts with a 4-byte "PABR" magic at offset 4 (not 0)
# So bytes 4-7 of plaintext = "PABR"?
# Then key bytes 4-7 = raw[4:8] XOR "PABR" = c2^P, 0e^A, 15^B, 9e^R = 82 4f 03 0a ... hmm
# But then bytes 0-3 would be... unknown

# Try: what if the plaintext is: [4-byte header][PABR + count][...]
# Then bytes 4-11 of plaintext = "PABR" + count(7663)
# Key[4:12] = raw[4:12] XOR ("PABR" + count)
key16_part2 = bytes([raw[4]^ord('P'), raw[5]^ord('A'), raw[6]^ord('B'), raw[7]^ord('R'),
                     raw[8]^0xef, raw[9]^0x1d, raw[10]^0x00, raw[11]^0x00])
print(f"=== Approach 6: assume PABR + count at offset 4 ===")
print(f"Key bytes 4-11: {key16_part2.hex()}")
# Apply to bytes 4-12 of raw
decrypted_4_12 = bytes(raw[4+i]^key16_part2[i] for i in range(8))
print(f"Decrypted bytes 4-12: {decrypted_4_12.hex()} ASCII={decrypted_4_12!r}")

# 7) What if the file is ICE-encrypted but with an OFFSET alignment?
# The data might have 4 bytes of header (unencrypted), then ICE-encrypted body.
# But then the body's first ICE block (8 bytes) would start at offset 4, and the block boundaries
# would be misaligned with the file's 8-byte alignment.
# Actually, ICE always works on 8-byte blocks. If the file's body starts at offset 4, then:
#   - raw bytes 0-3 are header (4 bytes)
#   - raw bytes 4-11 form the first ICE block (encrypted)
# But the file is 3864952 bytes, and (3864952 - 4) % 8 = 4. So the body is NOT 8-byte aligned!
# This means ICE doesn't apply directly to the body starting at offset 4.
# 
# UNLESS: the header is 8 bytes (not 4). Then (3864952 - 8) % 8 = 0. ✓
# But the offset index says record 0 starts at offset 4. So records overlap with the header.
# 
# Or maybe the records are byte-packed but the file's overall structure is 8-byte aligned at offset 0.

# 8) Try: assume the 4-byte header is unencrypted, and the records themselves are individually
# ICE-encrypted (each record is a separate ICE block, but records have variable length so they're
# padded to 8 bytes).
# This would mean the offset index's offset values point to record starts in the raw file.
# Let me check: record 0 starts at raw offset 4, size 92.
# If we ICE-decrypt raw[4:96] (92 bytes), we should get the record's plaintext.
# But ICE works on 8-byte blocks. 92 % 8 = 4. So we'd need to pad or truncate.
# Maybe each record is padded to a multiple of 8 bytes.

# 9) Maybe the file has its OWN 8-byte XOR key (not ICE-derived)
# Let me check: XOR with key 6a471ef12d13159e (derived from "PABR"+count assumption)
# Already done above — doesn't look like real plaintext.
# 
# But wait — maybe the file starts with "PABR" + count(7663) + a fixed-size header,
# THEN records. Let me see if applying the XOR key to bytes 8+ makes sense.
# If the file format is:
#   [PABR (4)] [count (4)] [some header (N bytes)] [records]
# Then we know the first 8 bytes. We don't know bytes 8+. 
# But maybe bytes 8-15 of the plaintext are also predictable (e.g., a second count, or all zeros).

# 10) Critical test: does the file have the same repeating pattern at offset multiples of 8?
# If the cipher is XOR with an 8-byte repeating key, then bytes at the same offset mod 8 share
# the key byte. So bytes 0, 8, 16, 24, ... all XOR with key[0]. If many of them are 0x00 (padding),
# then bytes at these positions in the ciphertext would all be key[0].
# 
# Let's check: most common byte at positions 0, 8, 16, ...
print("\n=== Most common byte at each position mod 8 in raw file ===")
for pos in range(8):
    bytes_at_pos = [raw[i] for i in range(pos, min(len(raw), 100000), 8)]
    c = Counter(bytes_at_pos)
    top_byte, top_count = c.most_common(1)[0]
    print(f"  pos {pos}: top byte = 0x{top_byte:02x} ({100*top_count/len(bytes_at_pos):.2f}%)")

# If the cipher is XOR with 8-byte key K, and many plaintext bytes are 0,
# then at each position p (mod 8), the most common ciphertext byte = K[p].
# So K would be the 8 bytes at the "top byte" row above.

# 11) Try the derived key from (10): the most common byte at each position mod 8
derived_key = bytes(Counter(raw[i] for i in range(p, len(raw), 8)).most_common(1)[0][0] for p in range(8))
print(f"\nDerived key (most-common-byte per position mod 8): {derived_key.hex()}")
dec_xor = bytes(raw[i] ^ derived_key[i % 8] for i in range(min(64, len(raw))))
print(f"First 64 bytes XOR'd: {dec_xor[:64].hex()}")
print(f"  ASCII: {dec_xor[:64]!r}")
print(f"  Starts with PABR: {dec_xor[:4] == b'PABR'}")

# 12) Try XOR'ing the ICE-decrypted file with the most-common-byte-per-position key
print("\n=== Apply derived key to ICE-decrypted file ===")
derived_key_dec = bytes(Counter(dec[i] for i in range(p, len(dec), 8)).most_common(1)[0][0] for p in range(8))
print(f"Derived key (decrypted): {derived_key_dec.hex()}")
dec_xor2 = bytes(dec[i] ^ derived_key_dec[i % 8] for i in range(min(64, len(dec))))
print(f"First 64 bytes XOR'd: {dec_xor2[:64].hex()}")
print(f"  ASCII: {dec_xor2[:64]!r}")
print(f"  Starts with PABR: {dec_xor2[:4] == b'PABR'}")
