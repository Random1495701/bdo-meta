#!/usr/bin/env python3
"""
Phase 1: Entropy & structure analysis of commandtooltip.dbss.
"""
import math
import os
import struct
import collections
from pathlib import Path

TARGET = Path("/home/z/my-project/upload/commandtooltip.dbss")
TOOLTIP = Path("/home/z/my-project/upload/tooltiptable.dbss")
OFFSET = Path("/home/z/my-project/upload/commandtooltipoffset.dbss")

def hexdump(b, n=256):
    n = min(n, len(b))
    out = []
    for i in range(0, n, 16):
        chunk = b[i:i+16]
        hex_part = " ".join(f"{x:02x}" for x in chunk)
        ascii_part = "".join(chr(x) if 32 <= x < 127 else "." for x in chunk)
        out.append(f"{i:08x}  {hex_part:<48}  {ascii_part}")
    return "\n".join(out)

def shannon(data):
    if not data:
        return 0.0
    freq = collections.Counter(data)
    n = len(data)
    h = 0.0
    for c in freq.values():
        p = c / n
        h -= p * math.log2(p)
    return h

def chunked_entropy(data, chunk=1024):
    entropies = []
    for i in range(0, len(data), chunk):
        entropies.append(shannon(data[i:i+chunk]))
    return entropies

def histogram(data):
    h = [0]*256
    for b in data:
        h[b] += 1
    return h

def find_strings(data, min_len=6):
    """Find printable ASCII strings of at least min_len chars."""
    strings = []
    cur = bytearray()
    start = 0
    for i, b in enumerate(data):
        if 32 <= b < 127:
            if not cur:
                start = i
            cur.append(b)
        else:
            if len(cur) >= min_len:
                strings.append((start, bytes(cur).decode("ascii", "ignore")))
            cur = bytearray()
    if len(cur) >= min_len:
        strings.append((start, bytes(cur).decode("ascii", "ignore")))
    return strings

def find_utf8_korean(data):
    """Korean (Hangul) UTF-8 ranges: AC00-D7AF, U+1100-U+11FF, U+3130-U+318F.
    In UTF-8 these are 3-byte sequences starting with 0xEA-0xED."""
    hits = []
    for i in range(len(data)-2):
        b0 = data[i]
        # Hangul syllables EA B0 80 .. ED 9E A0 (D7AF)
        if b0 == 0xEA or b0 == 0xEB or b0 == 0xEC or (b0 == 0xED and data[i+1] <= 0x9E):
            # Try to decode 3 bytes
            try:
                s = data[i:i+3].decode("utf-8")
                hits.append((i, s))
            except UnicodeDecodeError:
                pass
    return hits

def repeating_blocks(data, block_size):
    """Check if same 8/16-byte block appears multiple times."""
    seen = collections.Counter()
    for i in range(0, len(data)-block_size, block_size):
        block = bytes(data[i:i+block_size])
        seen[block] += 1
    return seen

def main():
    data = TARGET.read_bytes()
    size = len(data)
    print(f"=== {TARGET} ===")
    print(f"Size: {size} bytes ({size/1024:.1f} KB)")
    print(f"Size % 8 = {size % 8}, % 16 = {size % 16}, % 32 = {size % 32}, % 64 = {size % 64}")
    print()
    print("--- First 256 bytes (hex) ---")
    print(hexdump(data[:256]))
    print()
    print("--- Last 64 bytes (hex) ---")
    print(hexdump(data[-64:]))
    print()
    # Look at bytes 256..512 too
    print("--- Bytes 256..512 (hex) ---")
    print(hexdump(data[256:512]))
    print()

    print("--- Magic / header interpretation ---")
    # Try reading as u32 LE / BE / ASCII
    print(f"  first 4 bytes ASCII: {data[:4]!r}")
    print(f"  first 4 bytes u32 LE: 0x{struct.unpack('<I', data[:4])[0]:08x}")
    print(f"  first 4 bytes u32 BE: 0x{struct.unpack('>I', data[:4])[0]:08x}")
    print(f"  first 8 bytes ASCII: {data[:8]!r}")
    print(f"  first 16 bytes hex: {data[:16].hex()}")
    print(f"  first 32 bytes hex: {data[:32].hex()}")
    print()

    print("--- Overall Shannon entropy ---")
    e = shannon(data)
    print(f"  Overall: {e:.6f} bits/byte (max=8.0)")
    # Random/encrypted would be ~7.99-8.00. Compressed ~7-7.99. Plaintext ~3-6.
    print()

    print("--- Chunked entropy (1KB) ---")
    ents = chunked_entropy(data, 1024)
    n = len(ents)
    avg = sum(ents)/n
    mn = min(ents)
    mx = max(ents)
    # Distribution buckets
    buckets = [0]*8
    for e in ents:
        buckets[min(7, int(e))] += 1
    print(f"  n_chunks={n}, avg={avg:.4f}, min={mn:.4f}, max={mx:.4f}")
    print(f"  Distribution (floor bit): {buckets}")
    # First 10 chunk entropies
    print(f"  First 10: {[round(e,3) for e in ents[:10]]}")
    print(f"  Last 10: {[round(e,3) for e in ents[-10:]]}")
    print()

    print("--- Byte frequency histogram ---")
    hist = histogram(data)
    # Print as percentages sorted by frequency
    total = sum(hist)
    sorted_hist = sorted(((i,c) for i,c in enumerate(hist)), key=lambda x:-x[1])
    print(f"  Most frequent 10:")
    for i,c in sorted_hist[:10]:
        print(f"    0x{i:02x}: {c} ({100*c/total:.3f}%)")
    print(f"  Least frequent 10:")
    for i,c in sorted_hist[-10:]:
        print(f"    0x{i:02x}: {c} ({100*c/total:.3f}%)")
    # Std dev to measure uniformity
    mean = total / 256
    var = sum((c-mean)**2 for c in hist) / 256
    print(f"  Mean count per bucket: {mean:.1f}")
    print(f"  Std dev: {math.sqrt(var):.2f}  (random uniform would be ~{math.sqrt(mean):.1f})")
    print()

    print("--- ASCII strings >= 6 chars (first 30) ---")
    strings = find_strings(data, 6)
    print(f"  Total >=6: {len(strings)}")
    for off, s in strings[:30]:
        print(f"    @{off}: {s[:100]}")
    print()
    print("--- ASCII strings >= 12 chars (first 30) ---")
    strings12 = find_strings(data, 12)
    print(f"  Total >=12: {len(strings12)}")
    for off, s in strings12[:30]:
        print(f"    @{off}: {s[:100]}")
    print()

    print("--- Korean UTF-8 3-byte sequences (first 30) ---")
    kr = find_utf8_korean(data)
    print(f"  Total: {len(kr)}")
    for off, s in kr[:30]:
        print(f"    @{off}: {s} (next bytes: {data[off+3:off+12].hex()})")
    print()

    print("--- Search for template tokens ---")
    for tok in [b"{p0}", b"{p1}", b"{p2}", b"PABR", b"PAZS", b"PABR"]:
        cnt = data.count(tok)
        first = data.find(tok)
        print(f"  {tok!r}: count={cnt}, first_at={first}")
    print()

    print("--- Repeating 8-byte blocks (top 10) ---")
    reps8 = repeating_blocks(data, 8)
    top8 = reps8.most_common(10)
    for block, c in top8:
        print(f"  {block.hex()}: {c}")
    print()
    print("--- Repeating 16-byte blocks (top 10) ---")
    reps16 = repeating_blocks(data, 16)
    top16 = reps16.most_common(10)
    for block, c in top16:
        print(f"  {block.hex()}: {c}")
    print()

    # Compare with tooltiptable.dbss (PABR)
    tt = TOOLTIP.read_bytes()
    print(f"=== {TOOLTIP} ===")
    print(f"Size: {len(tt)} bytes ({len(tt)/1024:.1f} KB)")
    print(f"Size % 8 = {len(tt) % 8}, % 16 = {len(tt) % 16}")
    print("--- First 64 bytes ---")
    print(hexdump(tt[:64]))
    print(f"  Shannon entropy: {shannon(tt):.4f}")
    print()

    # Offset file
    if OFFSET.exists():
        off = OFFSET.read_bytes()
        print(f"=== {OFFSET} ===")
        print(f"Size: {len(off)} bytes")
        print("--- First 64 bytes ---")
        print(hexdump(off[:64]))
        print(f"  Shannon entropy: {shannon(off):.4f}")
        print()

if __name__ == "__main__":
    main()
