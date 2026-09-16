#!/usr/bin/env python3
"""
Parse commandtooltipoffset.dbss using the Go ParseOffsetIndex logic.
This gives us the actual byte ranges of records in commandtooltip.dbss.
"""
import struct
from pathlib import Path

OFFSET = Path("/home/z/my-project/upload/commandtooltipoffset.dbss")
DATA = Path("/home/z/my-project/upload/commandtooltip.dbss")

def U32(b, o): return struct.unpack('<I', b[o:o+4])[0]
def U16(b, o): return struct.unpack('<H', b[o:o+2])[0]

def parse_offset_index(b, data_len):
    """Mimics Go's ParseOffsetIndex."""
    if len(b) < 8:
        return None
    hdr = 4
    cnt = U32(b, 0)
    if b[:4] == b"PABR":
        hdr = 8
        cnt = U32(b, 4)
    if cnt == 0 or hdr + cnt*12 > len(b):
        return None
    cols = [
        lambda i: U32(b, hdr + i*12 + 0*4),
        lambda i: U32(b, hdr + i*12 + 1*4),
        lambda i: U32(b, hdr + i*12 + 2*4),
    ]
    def eval_pair(oc, sc):
        ivs = []
        sum_sizes = 0
        for i in range(cnt):
            o, s = cols[oc](i), cols[sc](i)
            if s == 0 or o + s > data_len:
                return None, False
            ivs.append((o, o+s))
            sum_sizes += s
        ivs.sort()
        for i in range(1, len(ivs)):
            if ivs[i][0] < ivs[i-1][1]:
                return None, False
        span = ivs[-1][1] - ivs[0][0]
        return span - sum_sizes, True
    best_gap, oc, sc = float('inf'), -1, -1
    for a in range(3):
        for s in range(3):
            if a == s: continue
            gap, ok = eval_pair(a, s)
            if ok and gap < best_gap:
                best_gap, oc, sc = gap, a, s
    if oc == -1:
        return None
    kc = 3 - oc - sc
    return [(cols[kc](i), cols[oc](i), cols[sc](i)) for i in range(cnt)]

def main():
    raw = OFFSET.read_bytes()
    data = DATA.read_bytes()
    data_len = len(data)
    print(f"Offset file size: {len(raw)} bytes")
    print(f"Offset file first 16 hex: {raw[:16].hex()}")
    print(f"Offset file [0:4] = {raw[:4]!r}")
    print(f"Offset file count@4 = {U32(raw, 4)}")
    print(f"Data file size: {data_len} bytes")
    print()
    entries = parse_offset_index(raw, data_len)
    if entries is None:
        print("Failed to parse offset index")
        return
    print(f"Parsed {len(entries)} entries")
    # Show first 10 and last 5
    print("\nFirst 10 entries (key, offset, size):")
    for k, o, s in entries[:10]:
        print(f"  key={k} (0x{k:08x}), offset={o}, size={s}")
    print("\nLast 5 entries:")
    for k, o, s in entries[-5:]:
        print(f"  key={k} (0x{k:08x}), offset={o}, size={s}")
    # Size statistics
    sizes = [s for _,_,s in entries]
    print(f"\nSize stats: min={min(sizes)}, max={max(sizes)}, mean={sum(sizes)/len(sizes):.1f}")
    # Sorted unique sizes
    from collections import Counter
    sz_counts = Counter(sizes).most_common(15)
    print("Top 15 most common sizes:")
    for sz, c in sz_counts:
        print(f"  size={sz}: {c} records")
    
    # Check if all entries are within bounds
    print(f"\nTotal span (sum of sizes): {sum(sizes)}")
    print(f"Data file size: {data_len}")
    print(f"Coverage: {100*sum(sizes)/data_len:.2f}%")
    
    # Show the first record's bytes (raw, encrypted)
    k, o, s = entries[0]
    rec = data[o:o+s]
    print(f"\nFirst record bytes (offset={o}, size={s}):")
    print(f"  hex: {rec.hex()[:128]}{'...' if s > 64 else ''}")
    print(f"  ASCII: {rec[:64]!r}")
    
    # Check if the first 8 bytes of every record are the same
    first_bytes_per_record = []
    for k, o, s in entries:
        if s >= 8:
            first_bytes_per_record.append(data[o:o+8])
    from collections import Counter
    fb_counts = Counter(first_bytes_per_record).most_common(10)
    print(f"\nTop 10 first-8-bytes patterns across records:")
    for fb, c in fb_counts:
        print(f"  {fb.hex()}: {c} records")
    
    # Save entries for later use
    import json
    out = [{"key": k, "offset": o, "size": s} for k, o, s in entries]
    Path("/tmp/cmdtt/offset_entries.json").write_text(json.dumps(out, indent=2))
    print(f"\nSaved {len(out)} entries to /tmp/cmdtt/offset_entries.json")

if __name__ == "__main__":
    main()
