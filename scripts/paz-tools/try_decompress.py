#!/usr/bin/env python3
"""
Try compressing/decompressing the ICE-decrypted file with various algorithms.
If ICE-decryption produces a compressed blob, the LZ/zlib/zstd decompression should
yield real plaintext.
"""
import struct
import lz4.block
import zlib
import zstandard as zstd
from pathlib import Path

ICE_DEC = Path("/tmp/cmdtt/cmdtt_ice_go_decrypted.bin")
RAW = Path("/home/z/my-project/upload/commandtooltip.dbss")

def hexdump(b, n=64):
    out = []
    for i in range(0, min(n, len(b)), 16):
        chunk = b[i:i+16]
        hex_part = " ".join(f"{x:02x}" for x in chunk)
        ascii_part = "".join(chr(x) if 32 <= x < 127 else "." for x in chunk)
        out.append(f"{i:08x}  {hex_part:<48}  {ascii_part}")
    return "\n".join(out)

dec = ICE_DEC.read_bytes()
raw = RAW.read_bytes()

print("=== Try LZ4 decompression ===")
# Try decompressing the whole file
for label, data in [("raw", raw), ("ice_dec", dec)]:
    for start in [0, 4, 8, 16]:
        try:
            # Try various sizes
            result = lz4.block.decompress(data[start:start+200000], uncompressed_size=4_000_000)
            print(f"  {label} from offset {start}: SUCCESS! Decompressed {len(result)} bytes")
            print(f"  First 64 bytes: {result[:64].hex()}")
        except Exception as e:
            pass
        try:
            result = lz4.frame.decompress(data[start:])
            print(f"  {label} from offset {start} (frame): SUCCESS! Decompressed {len(result)} bytes")
            print(f"  First 64 bytes: {result[:64].hex()}")
        except Exception as e:
            pass

print("\n=== Try zlib decompression ===")
for label, data in [("raw", raw), ("ice_dec", dec)]:
    for start in [0, 4, 8, 16, 32]:
        try:
            d = zlib.decompressobj()
            result = d.decompress(data[start:])
            if len(result) > 0:
                print(f"  {label} from offset {start}: SUCCESS! Decompressed {len(result)} bytes")
                print(f"  First 64 bytes: {result[:64].hex()}")
                print(f"  ASCII: {result[:64]!r}")
        except Exception as e:
            pass

print("\n=== Try zstd decompression ===")
for label, data in [("raw", raw), ("ice_dec", dec)]:
    for start in [0, 4, 8, 16, 32]:
        try:
            dctx = zstd.ZstdDecompressor()
            result = dctx.decompress(data[start:])
            if len(result) > 0:
                print(f"  {label} from offset {start}: SUCCESS! Decompressed {len(result)} bytes")
                print(f"  First 64 bytes: {result[:64].hex()}")
        except Exception as e:
            pass
        try:
            dctx = zstd.ZstdDecompressor()
            # Try with max_window_size
            result = dctx.decompress(data[start:], max_output_size=10_000_000)
            if len(result) > 0:
                print(f"  {label} from offset {start} (max_output_size): SUCCESS! Decompressed {len(result)} bytes")
        except Exception as e:
            pass

# Try the bdo-data-extractor's custom LZ decompression (paz.Decompress)
# The container format is: byte 0 = 0x6E or 0x6F; u32@5 = origSize
# Our file's byte 0 = 0x3a (raw), 0xcd (decrypted) — neither matches
# But maybe it works anyway
print("\n=== Try BDO custom LZ decompression ===")
import sys
sys.path.insert(0, "/home/z/my-project/scripts/paz-tools")

# Implement the Go lz.go logic in Python
LIT_LEN_TABLE = [4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0]
def U32(b, o): return struct.unpack('<I', b[o:o+4])[0]

def parse_file_header(data):
    if data[0] & 0x02 != 0:
        comp_len = U32(data, 1)
        decomp_len = U32(data, 5)
        return decomp_len, comp_len, 9
    return data[2], data[1], 3

def parse_block_header(h):
    h = h & 0xFFFFFFFF
    if (h & 0x03) == 0x03:
        if (h & 0x7F) == 3:
            return h >> 15, ((h >> 7) & 0xFF) + 3, 4
        return (h >> 7) & 0x1FFFF, ((h >> 2) & 0x1F) + 2, 3
    elif (h & 0x03) == 0x02:
        return (h & 0xFFFF) >> 6, ((h >> 2) & 0xF) + 3, 2
    elif (h & 0x03) == 0x01:
        return (h & 0xFFFF) >> 2, 3, 2
    else:
        return (h & 0xFF) >> 2, 3, 1

def bdo_decompress(data, original_size):
    if not data: return None
    flags = data[0]
    target, comp_len, header_size = parse_file_header(data)
    if len(data) < comp_len: comp_len = len(data)
    data = data[:comp_len]
    if flags & 0x01 == 0:
        end = header_size + target
        if end > len(data): end = len(data)
        return data[header_size:end]
    out = bytearray(target)
    in_idx, out_idx = header_size, 0
    group_header = 1
    n = len(data)
    while out_idx < target and in_idx < n:
        if group_header == 1:
            if in_idx + 4 > n: break
            group_header = U32(data, in_idx)
            in_idx += 4
        if group_header & 1:
            if in_idx + 4 > n: break
            h = U32(data, in_idx)
            dist, length, step = parse_block_header(h)
            in_idx += step
            if out_idx < dist or out_idx + length > target: break
            src = out_idx - dist
            for k in range(length):
                out[out_idx + k] = out[src + k]
            out_idx += length
            group_header >>= 1
        else:
            lit_len = LIT_LEN_TABLE[group_header & 0xF]
            if out_idx + 4 > target or in_idx + 4 > n: break
            out[out_idx:out_idx+4] = data[in_idx:in_idx+4]
            out_idx += lit_len
            in_idx += lit_len
            group_header >>= lit_len
    # tail
    while out_idx < target:
        if group_header == 1:
            if in_idx + 4 <= n:
                in_idx += 4
            group_header = 0x80000000
        if in_idx >= n: break
        out[out_idx] = data[in_idx]
        out_idx += 1
        in_idx += 1
        group_header >>= 1
    return bytes(out[:out_idx])

for label, data in [("raw", raw), ("ice_dec", dec)]:
    for start in [0, 4, 8, 16, 32]:
        try:
            result = bdo_decompress(data[start:], 4_000_000)
            if result and len(result) > 100:
                # Check if result has PABR or readable text
                has_pabr = b'PABR' in result[:16]
                has_korean = any(b == 0xEA for b in result[:1000])
                print(f"  {label} from offset {start}: decompressed {len(result)} bytes, PABR@0={has_pabr}, Korean={has_korean}")
                if has_pabr or has_korean:
                    print(f"  First 64 bytes: {result[:64].hex()}")
                    print(f"  ASCII: {result[:64]!r}")
        except Exception as e:
            pass
