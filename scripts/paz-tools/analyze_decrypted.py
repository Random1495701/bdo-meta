#!/usr/bin/env python3
"""
Analyze the ICE-decrypted commandtooltip.dbss:
- Compare first record's bytes to the offset-index key
- Check if records start with their key (as the Go-side other tables do)
- Check for repeating 8-byte plaintext blocks (would indicate ECB with same plaintext)
"""
import struct
import json
from collections import Counter
from pathlib import Path

DECRYPTED = Path("/tmp/cmdtt/cmdtt_ice_go_decrypted.bin")
RAW = Path("/home/z/my-project/upload/commandtooltip.dbss")
ENTRIES_FILE = Path("/tmp/cmdtt/offset_entries.json")

def U32(b, o): return struct.unpack('<I', b[o:o+4])[0]
def U32be(b, o): return struct.unpack('>I', b[o:o+4])[0]

def hexdump(b, n=64):
    out = []
    for i in range(0, min(n, len(b)), 16):
        chunk = b[i:i+16]
        hex_part = " ".join(f"{x:02x}" for x in chunk)
        ascii_part = "".join(chr(x) if 32 <= x < 127 else "." for x in chunk)
        out.append(f"{i:08x}  {hex_part:<48}  {ascii_part}")
    return "\n".join(out)

def main():
    data = DECRYPTED.read_bytes()
    raw = RAW.read_bytes()
    entries = json.loads(ENTRIES_FILE.read_text())
    
    print(f"Decrypted size: {len(data)} bytes")
    print(f"Decrypted file first 64 bytes hex:")
    print(hexdump(data[:64]))
    print()
    
    # Check first 4 bytes interpretation
    print(f"First 4 bytes decrypted hex: {data[:4].hex()}")
    print(f"  As u32 LE: {U32(data, 0)} (0x{U32(data,0):08x})")
    print(f"  As u32 BE: {U32be(data, 0)} (0x{U32be(data,0):08x})")
    print(f"  As ASCII: {data[:4]!r}")
    print()
    
    # The first record starts at offset 4. Show the first record's first 16 bytes.
    e0 = entries[0]
    print(f"First entry: key={e0['key']} (0x{e0['key']:08x}), offset={e0['offset']}, size={e0['size']}")
    rec0 = data[e0['offset']:e0['offset']+e0['size']]
    print(f"First record's first 16 bytes (decrypted): {rec0[:16].hex()}")
    print(f"  u32 LE @0: 0x{U32(rec0,0):08x}")
    print(f"  u32 LE @4: 0x{U32(rec0,4):08x}")
    print(f"  u32 LE @8: 0x{U32(rec0,8):08x}")
    print(f"  Expected key (from offset index): 0x{e0['key']:08x}")
    
    # Check if the first 4 bytes of each record match its offset-index key
    print("\n=== Checking if records' first 4 bytes == offset key ===")
    matches = 0
    total = len(entries)
    first_4_bytes_per_record = []
    for e in entries:
        if e['offset'] + 4 <= len(data):
            first4 = data[e['offset']:e['offset']+4]
            first_4_bytes_per_record.append(first4)
            if U32(first4, 0) == e['key']:
                matches += 1
    print(f"  Matches: {matches}/{total} ({100*matches/total:.2f}%)")
    
    # Check if records' first 4 bytes match the BE-interpreted key
    matches_be = 0
    for e in entries:
        if e['offset'] + 4 <= len(data):
            first4 = data[e['offset']:e['offset']+4]
            if U32be(first4, 0) == e['key']:
                matches_be += 1
    print(f"  Matches (BE key): {matches_be}/{total}")
    
    # Check if the records' 4-byte key is at a different offset within the record
    print("\n=== Looking for the offset-index key inside first 100 records ===")
    for off_in_rec in range(0, 40, 4):
        matches = 0
        for e in entries[:1000]:
            if e['offset'] + off_in_rec + 4 <= len(data):
                first4 = data[e['offset']+off_in_rec:e['offset']+off_in_rec+4]
                if U32(first4, 0) == e['key']:
                    matches += 1
        if matches > 0:
            print(f"  Offset {off_in_rec} in record: {matches}/1000 matches (LE)")
    
    # Now look at the actual bytes of the first few records
    print("\n=== First 5 records (decrypted), first 64 bytes each ===")
    for i, e in enumerate(entries[:5]):
        rec = data[e['offset']:e['offset']+e['size']]
        print(f"\nRecord {i}: key=0x{e['key']:08x}, offset={e['offset']}, size={e['size']}")
        print(hexdump(rec[:64]))
    
    # Check repeating 8-byte blocks in decrypted file
    print("\n=== Repeating 8-byte blocks in DECRYPTED file (top 10) ===")
    blocks = Counter()
    for i in range(0, len(data)-8, 8):
        block = bytes(data[i:i+8])
        blocks[block] += 1
    for block, count in blocks.most_common(10):
        print(f"  {block.hex()}: {count}")
    
    # Check repeating 8-byte blocks in raw (encrypted) file (just to compare)
    print("\n=== Repeating 8-byte blocks in RAW (encrypted) file (top 10) ===")
    blocks_r = Counter()
    for i in range(0, len(raw)-8, 8):
        block = bytes(raw[i:i+8])
        blocks_r[block] += 1
    for block, count in blocks_r.most_common(10):
        print(f"  {block.hex()}: {count}")
    
    # Now compare — in the decrypted file, is there a single 8-byte block that appears 10000+ times?
    # That would indicate the plaintext has many zero (or fixed) blocks.
    # If plaintext has 12182 zero-blocks, then in the encrypted file, ICE_encrypt(0x00*8) = 41ef586af7ca4f0e (Go test).
    # But the top encrypted block is 0619e4769559b1fd. So either:
    # 1. The plaintext fixed block isn't zero, it's something else
    # 2. Or the cipher isn't ICE with this key
    
    # Let's find what plaintext block the encrypted "0619e4769559b1fd" corresponds to (if the cipher IS ICE)
    # We can decrypt that one 8-byte block with ICE.
    # We already have the decrypted file. Let's find positions of "0619e4769559b1fd" in the encrypted file
    # and check what's at those positions in the decrypted file.
    
    enc_block = bytes.fromhex("0619e4769559b1fd")
    positions = []
    start = 0
    while True:
        i = raw.find(enc_block, start)
        if i == -1: break
        positions.append(i)
        start = i + 1
        if len(positions) >= 5: break
    print(f"\nFirst 5 positions of encrypted block {enc_block.hex()}:")
    for p in positions:
        dec_at_p = data[p:p+8]
        print(f"  enc @{p}: dec={dec_at_p.hex()} ASCII={dec_at_p!r}")
    
    # Also do the same for second-most-common encrypted block
    enc_block = bytes.fromhex("d1130fc7db36445c")
    positions = []
    start = 0
    while True:
        i = raw.find(enc_block, start)
        if i == -1: break
        positions.append(i)
        start = i + 1
        if len(positions) >= 5: break
    print(f"\nFirst 5 positions of encrypted block {enc_block.hex()}:")
    for p in positions:
        dec_at_p = data[p:p+8]
        print(f"  enc @{p}: dec={dec_at_p.hex()} ASCII={dec_at_p!r}")

if __name__ == "__main__":
    main()
