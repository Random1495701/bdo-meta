#!/usr/bin/env python3
"""
Fresh Python port of the ICE cipher, derived directly from
/tmp/bdo-data-extractor/internal/paz/ice.go.
Goal: byte-for-byte parity with the Go implementation.
"""
import struct
from typing import List, Tuple

# --- Constants (copied directly) ---------------------------------------------

BDOICEKey = bytes([0x51, 0xF3, 0x0F, 0x11, 0x04, 0x24, 0x6A, 0x00])

ICE_SMOD = (
    (333, 313, 505, 369),
    (379, 375, 319, 391),
    (361, 445, 451, 397),
    (397, 425, 395, 505),
)
ICE_SXOR = (
    (0x83, 0x85, 0x9b, 0xcd),
    (0xcc, 0xa7, 0xad, 0x41),
    (0x4b, 0x2e, 0xd4, 0x33),
    (0xea, 0xcb, 0x2e, 0x04),
)
ICE_PBOX = (
    0x00000001, 0x00000080, 0x00000400, 0x00002000,
    0x00080000, 0x00200000, 0x01000000, 0x40000000,
    0x00000008, 0x00000020, 0x00000100, 0x00004000,
    0x00010000, 0x00800000, 0x04000000, 0x20000000,
    0x00000004, 0x00000010, 0x00000200, 0x00008000,
    0x00020000, 0x00400000, 0x08000000, 0x10000000,
    0x00000002, 0x00000040, 0x00000800, 0x00001000,
    0x00040000, 0x00100000, 0x02000000, 0x80000000,
)
KEY_ROT = (0, 1, 2, 3, 2, 1, 3, 0, 1, 3, 2, 0, 3, 1, 0, 2)


# --- Bit helpers (always mask to 32-bit to mimic Go uint32) -----------------

def mask32(x: int) -> int:
    return x & 0xFFFFFFFF


def gf_mult(a: int, b: int, m: int) -> int:
    """GF(2^8) multiplication mod m, like Go's gfMult."""
    a = mask32(a)
    b = mask32(b)
    res = 0
    while b != 0:
        if b & 1:
            res ^= a
        a = mask32(a << 1)
        b >>= 1
        if a >= 256:
            a ^= m
    return res


def gf_exp7(b: int, m: int) -> int:
    if b == 0:
        return 0
    x = gf_mult(b, b, m)
    x = gf_mult(b, x, m)
    x = gf_mult(x, x, m)
    return gf_mult(b, x, m)


def ice_perm32(x: int) -> int:
    res = 0
    for pb in ICE_PBOX:
        if x & 1:
            res |= pb
        x >>= 1
    return res


def build_sbox() -> List[int]:
    sbox = [0] * 4096
    for i in range(1024):
        col = (i >> 1) & 0xFF
        row = (i & 0x1) | ((i & 0x200) >> 8)
        sbox[i] = mask32(ice_perm32(gf_exp7(col ^ ICE_SXOR[0][row], ICE_SMOD[0][row])) << 24)
        sbox[1024 + i] = mask32(ice_perm32(gf_exp7(col ^ ICE_SXOR[1][row], ICE_SMOD[1][row])) << 16)
        sbox[2048 + i] = mask32(ice_perm32(gf_exp7(col ^ ICE_SXOR[2][row], ICE_SMOD[2][row])) << 8)
        sbox[3072 + i] = mask32(ice_perm32(gf_exp7(col ^ ICE_SXOR[3][row], ICE_SMOD[3][row])))
    return sbox


ICE_SBOX = build_sbox()


def rotl(v: int, n: int) -> int:
    v = mask32(v)
    return mask32((v << n) | (v >> (32 - n)))


# --- ICE cipher -------------------------------------------------------------

class ICE:
    def __init__(self, key: bytes):
        assert len(key) == 8
        self.rounds = 8
        self.keysched: List[Tuple[int, int, int]] = [(0, 0, 0)] * 8
        self.key_set(key)

    def key_sched_build(self, kb: List[int], n: int):
        """kb is the 4-element list of 16-bit key parts; n is the starting index."""
        for i in range(8):
            kr = KEY_ROT[i]
            # isk = new subkey triple
            isk0, isk1, isk2 = 0, 0, 0
            for _ in range(5):
                for j in range(3):
                    cur = (isk0, isk1, isk2)[j]
                    for k in range(4):
                        idx = (kr + k) & 3
                        bit = kb[idx] & 1
                        cur = mask32((cur << 1) | bit)
                        kb[idx] = mask32(((kb[idx] >> 1) | ((bit ^ 1) << 15))) & 0xFFFF
                    if j == 0:
                        isk0 = cur
                    elif j == 1:
                        isk1 = cur
                    else:
                        isk2 = cur
            self.keysched[n + i] = (isk0, isk1, isk2)

    def key_set(self, key: bytes):
        kb = [0, 0, 0, 0]
        for i in range(4):
            kb[3 - i] = (key[i * 2] << 8) | key[i * 2 + 1]
        self.key_sched_build(kb, 0)

    def ice_f(self, p: int, sk: Tuple[int, int, int]) -> int:
        p = mask32(p)
        tr = (p & 0x3FF) | mask32((p << 2) & 0xFFC00)
        tl = mask32((p >> 16) & 0x3FF) | mask32(rotl(p, 18) & 0xFFC00)
        salt = sk[2] & (tl ^ tr)
        al = salt ^ tl ^ sk[0]
        ar = salt ^ tr ^ sk[1]
        return (
            ICE_SBOX[(al >> 10) & 0x3FF]
            ^ ICE_SBOX[1024 + (al & 0x3FF)]
            ^ ICE_SBOX[2048 + ((ar >> 10) & 0x3FF)]
            ^ ICE_SBOX[3072 + (ar & 0x3FF)]
        )

    def crypt_block(self, l: int, r: int, encrypt: bool):
        ks = self.keysched
        if encrypt:
            for i in range(0, self.rounds, 2):
                l = mask32(l ^ self.ice_f(r, ks[i]))
                r = mask32(r ^ self.ice_f(l, ks[i + 1]))
        else:
            for i in range(self.rounds - 2, -1, -2):
                l = mask32(l ^ self.ice_f(r, ks[i + 1]))
                r = mask32(r ^ self.ice_f(l, ks[i]))
        return l, r

    def crypt(self, data: bytes, encrypt: bool) -> bytes:
        out = bytearray(data)
        n = len(data) - (len(data) % 8)
        for off in range(0, n, 8):
            l = struct.unpack(">I", data[off:off + 4])[0]
            r = struct.unpack(">I", data[off + 4:off + 8])[0]
            l, r = self.crypt_block(l, r, encrypt)
            # halves swapped on write-back (as in Go)
            struct.pack_into(">I", out, off, r)
            struct.pack_into(">I", out, off + 4, l)
        return bytes(out)

    def decrypt(self, data: bytes) -> bytes:
        return self.crypt(data, False)

    def encrypt(self, data: bytes) -> bytes:
        return self.crypt(data, True)


# --- Tests ------------------------------------------------------------------

def test_known_vector():
    """Test by encrypting a known plaintext and verifying it against the Go implementation.
    The previous task said: encrypted "PABR" with ICE → got '2f5848497263d47e'
    Let's verify our port matches that.
    """
    ice = ICE(BDOICEKey)
    # PABR is 4 bytes; need 8 bytes total. PABR + 4 null bytes.
    plaintext = b"PABR\x00\x00\x00\x00"
    ct = ice.encrypt(plaintext)
    print(f"  Encrypting 'PABR\\x00\\x00\\x00\\x00' (8 bytes):")
    print(f"    Plaintext hex:  {plaintext.hex()}")
    print(f"    Ciphertext hex: {ct.hex()}")
    # Previous task said Go produced: 2f5848497263d47e for "PABR"
    # If our port produces the same, our port is correct.
    if ct.hex() == "2f5848497263d47e":
        print("    ✓ MATCHES prior Go output — port is correct")
    else:
        print(f"    ✗ Does not match prior Go output '2f5848497263d47e'")
    
    # Round-trip test
    decrypted = ice.decrypt(ct)
    print(f"  Round-trip decrypt of ciphertext: {decrypted.hex()} ASCII={decrypted!r}")
    assert decrypted == plaintext, "Round-trip failed!"
    print("    ✓ Round-trip verified")

    # Another test: try with all zeros (matches official ICE test vectors better)
    plaintext = b"\x00" * 8
    ct = ice.encrypt(plaintext)
    pt2 = ice.decrypt(ct)
    print(f"  All-zero block encrypts to: {ct.hex()}")
    print(f"    Round-trip: {pt2.hex()} ✓" if pt2 == plaintext else "    ✗ round-trip fail")
    return ct.hex()


def main():
    print("=== ICE cipher port test ===")
    zero_ct = test_known_vector()
    
    # Now decrypt the file
    print("\n=== Decrypting commandtooltip.dbss ===")
    from pathlib import Path
    data = Path("/home/z/my-project/upload/commandtooltip.dbss").read_bytes()
    print(f"  File size: {len(data)} bytes, %8={len(data)%8}")
    
    ice = ICE(BDOICEKey)
    decrypted = ice.decrypt(data)
    
    print(f"  First 64 bytes decrypted hex:  {decrypted[:64].hex()}")
    print(f"  First 64 bytes decrypted ASCII: {decrypted[:64]!r}")
    print(f"  Starts with PABR? {decrypted[:4] == b'PABR'}")
    
    # Save the decrypted output for further analysis
    Path("/tmp/cmdtt/cmdtt_ice_decrypted.bin").write_bytes(decrypted)
    print(f"  Saved decrypted file to /tmp/cmdtt/cmdtt_ice_decrypted.bin")


if __name__ == "__main__":
    main()
