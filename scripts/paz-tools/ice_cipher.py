#!/usr/bin/env python3
"""
Python port of the ICE cipher from bdo-data-extractor/internal/paz/ice.go
BDO uses thin-ICE (level 0, 8 rounds) with key [0x51, 0xF3, 0x0F, 0x11, 0x04, 0x24, 0x6A, 0x00]
"""
import struct, os

BDOICE_KEY = bytes([0x51, 0xF3, 0x0F, 0x11, 0x04, 0x24, 0x6A, 0x00])

ICE_S_MOD = [
    [333, 313, 505, 369], [379, 375, 319, 391],
    [361, 445, 451, 397], [397, 425, 395, 505],
]
ICE_S_XOR = [
    [0x83, 0x85, 0x9b, 0xcd], [0xcc, 0xa7, 0xad, 0x41],
    [0x4b, 0x2e, 0xd4, 0x33], [0xea, 0xcb, 0x2e, 0x04],
]
ICE_P_BOX = [
    0x00000001, 0x00000080, 0x00000400, 0x00002000, 0x00080000, 0x00200000, 0x01000000, 0x40000000,
    0x00000008, 0x00000020, 0x00000100, 0x00004000, 0x00010000, 0x00800000, 0x04000000, 0x20000000,
    0x00000004, 0x00000010, 0x00000200, 0x00008000, 0x00020000, 0x00400000, 0x08000000, 0x10000000,
    0x00000002, 0x00000040, 0x00000800, 0x00001000, 0x00040000, 0x00100000, 0x02000000, 0x80000000,
]
KEY_ROT = [0, 1, 2, 3, 2, 1, 3, 0, 1, 3, 2, 0, 3, 1, 0, 2]

MASK32 = 0xFFFFFFFF
MASK16 = 0xFFFF


def gf_mult(a, b, m):
    # Match Go: uint32 arithmetic, but a stays < 256 due to XOR reduction
    res = 0
    while b != 0:
        if b & 1:
            res ^= a
        a <<= 1
        b >>= 1
        if a >= 256:
            a ^= m
    return res


def gf_exp7(b, m):
    if b == 0:
        return 0
    x = gf_mult(b, b, m)
    x = gf_mult(b, x, m)
    x = gf_mult(x, x, m)
    return gf_mult(b, x, m)


def ice_perm32(x):
    res = 0
    for pb in ICE_P_BOX:
        if x & 1:
            res |= pb
        x >>= 1
    return res


def build_sbox():
    sbox = [0] * 4096
    for i in range(1024):
        col = (i >> 1) & 0xFF
        row = (i & 0x1) | ((i & 0x200) >> 8)
        sbox[i] = ice_perm32(gf_exp7(col ^ ICE_S_XOR[0][row], ICE_S_MOD[0][row]) << 24)
        sbox[1024 + i] = ice_perm32(gf_exp7(col ^ ICE_S_XOR[1][row], ICE_S_MOD[1][row]) << 16)
        sbox[2048 + i] = ice_perm32(gf_exp7(col ^ ICE_S_XOR[2][row], ICE_S_MOD[2][row]) << 8)
        sbox[3072 + i] = ice_perm32(gf_exp7(col ^ ICE_S_XOR[3][row], ICE_S_MOD[3][row]))
    return sbox


ICE_SBOX = build_sbox()


def rotl(v, n):
    return ((v << n) | (v >> (32 - n))) & MASK32


class ICE:
    def __init__(self, key):
        self.rounds = 8
        self.keysched = [[0, 0, 0] for _ in range(8)]
        self.key_set(key)

    def key_sched_build(self, kb, n):
        kb = list(kb)
        for i in range(8):
            kr = KEY_ROT[i]
            isk = self.keysched[n + i]
            isk[0], isk[1], isk[2] = 0, 0, 0
            for _ in range(5):
                for j in range(3):
                    cur = isk[j]
                    for k in range(4):
                        idx = (kr + k) & 3
                        bit = kb[idx] & 1
                        cur = ((cur << 1) | bit) & MASK32
                        kb[idx] = ((kb[idx] >> 1) | (((bit ^ 1) & 1) << 15)) & MASK16
                    isk[j] = cur

    def key_set(self, key):
        kb = [0] * 4
        for i in range(4):
            kb[3 - i] = (key[i * 2] << 8) | key[i * 2 + 1]
        self.key_sched_build(kb, 0)

    def ice_f(self, p, sk):
        tr = (p & 0x3FF) | ((p << 2) & 0xFFC00)
        tl = ((p >> 16) & 0x3FF) | (rotl(p, 18) & 0xFFC00)
        salt = sk[2] & (tl ^ tr)
        al = salt ^ tl ^ sk[0]
        ar = salt ^ tr ^ sk[1]
        return (ICE_SBOX[(al >> 10) & 0x3FF] ^
                ICE_SBOX[1024 + (al & 0x3FF)] ^
                ICE_SBOX[2048 + ((ar >> 10) & 0x3FF)] ^
                ICE_SBOX[3072 + (ar & 0x3FF)]) & MASK32

    def crypt_block(self, l, r, encrypt):
        ks = self.keysched
        if encrypt:
            for i in range(0, self.rounds, 2):
                l = (l ^ self.ice_f(r, ks[i])) & MASK32
                r = (r ^ self.ice_f(l, ks[i + 1])) & MASK32
        else:
            for i in range(self.rounds - 2, -1, -2):
                l = (l ^ self.ice_f(r, ks[i + 1])) & MASK32
                r = (r ^ self.ice_f(l, ks[i])) & MASK32
        return l, r

    def decrypt(self, data):
        result = bytearray(data)
        n = len(data) - (len(data) % 8)
        for off in range(0, n, 8):
            l = struct.unpack('>I', data[off:off + 4])[0]
            r = struct.unpack('>I', data[off + 4:off + 8])[0]
            l, r = self.crypt_block(l, r, False)
            result[off:off + 4] = struct.pack('>I', r)
            result[off + 4:off + 8] = struct.pack('>I', l)
        return bytes(result)


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <input> <output>")
        sys.exit(1)

    in_path = sys.argv[1]
    out_path = sys.argv[2]

    with open(in_path, 'rb') as f:
        data = f.read()

    print(f"Input: {len(data)} bytes")
    print(f"First 16 bytes: {data[:16].hex()}")

    ice = ICE(BDOICE_KEY)
    decrypted = ice.decrypt(data)

    print(f"\nDecrypted first 32 bytes: {decrypted[:32].hex()}")
    print(f"Decrypted first 16 as ASCII: {decrypted[:16]!r}")

    if len(decrypted) >= 4 and decrypted[:4] == b'PABR':
        print("✓ Decrypted data starts with PABR!")
    else:
        print(f"✗ Decrypted data does NOT start with PABR (got {decrypted[:4]!r})")

    with open(out_path, 'wb') as f:
        f.write(decrypted)
    print(f"Wrote {len(decrypted)} bytes to {out_path}")
