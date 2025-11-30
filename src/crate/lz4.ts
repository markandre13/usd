//
// copied on 2025-11-30 from https://github.com/Benzinga/lz4js
//                           copyright 2018 John Chadwick, licensed under ISC
// with the following changes to compressBlock():
// * fix: return something when input which can't be compressed
// * remove hashtable argument
//

// Compression format parameters/constants.
var minMatch = 4
var minLength = 13
var searchLimit = 5
var skipTrigger = 6
var hashSize = 1 << 16

// Token constants.
var mlBits = 4
var mlMask = (1 << mlBits) - 1
var runBits = 4
var runMask = (1 << runBits) - 1

// Shared buffers
var hashTable = new Uint32Array(hashSize)

const util = {
    hashU32: function hashU32(a: number) {
        a = a | 0
        a = a + 2127912214 + (a << 12) | 0
        a = a ^ -949894596 ^ a >>> 19
        a = a + 374761393 + (a << 5) | 0
        a = a + -744332180 ^ a << 9
        a = a + -42973499 + (a << 3) | 0
        return a ^ -1252372727 ^ a >>> 16 | 0
    },
    readU32: function readU32(b: Uint8Array, n: number) {
        var x = 0
        x |= b[n++] << 0
        x |= b[n++] << 8
        x |= b[n++] << 16
        x |= b[n++] << 24
        return x
    }
}

export function decompressBlock(src: Uint8Array, dst: Uint8Array, sIndex: number, sLength: number, dIndex: number) {
    var mLength, mOffset, sEnd, n, i

    // Setup initial state.
    sEnd = sIndex + sLength

    // Consume entire input block.
    while (sIndex < sEnd) {
        var token = src[sIndex++]

        // Copy literals.
        var literalCount = (token >> 4)
        if (literalCount > 0) {
            // Parse length.
            if (literalCount === 0xf) {
                while (true) {
                    literalCount += src[sIndex]
                    if (src[sIndex++] !== 0xff) {
                        break
                    }
                }
            }

            // Copy literals
            for (n = sIndex + literalCount; sIndex < n;) {
                dst[dIndex++] = src[sIndex++]
            }
        }

        if (sIndex >= sEnd) {
            break
        }

        // Copy match.
        mLength = (token & 0xf)

        // Parse offset.
        mOffset = src[sIndex++] | (src[sIndex++] << 8)

        // Parse length.
        if (mLength === 0xf) {
            while (true) {
                mLength += src[sIndex]
                if (src[sIndex++] !== 0xff) {
                    break
                }
            }
        }

        mLength += minMatch

        // Copy match.
        for (i = dIndex - mOffset, n = i + mLength; i < n;) {
            dst[dIndex++] = dst[i++] | 0
        }
    }

    return dIndex
};

export function compressBound(n: number) {
    return (n + (n / 255) + 16) | 0
};

export function compressBlock(src: Uint8Array, dst: Uint8Array, sIndex: number, sLength: number) {
    hashTable.fill(0)

    var mIndex, mAnchor, mLength, mOffset, mStep
    var literalCount, dIndex, sEnd, n

    // Setup initial state.
    dIndex = 0
    sEnd = sLength + sIndex
    mAnchor = sIndex

    // Process only if block is large enough.
    if (sLength >= minLength) {
        var searchMatchCount = (1 << skipTrigger) + 3

        // Consume until last n literals (Lz4 spec limitation.)
        while (sIndex + minMatch < sEnd - searchLimit) {
            var seq = util.readU32(src, sIndex)
            var hash = util.hashU32(seq) >>> 0

            // Crush hash to 16 bits.
            hash = ((hash >> 16) ^ hash) >>> 0 & 0xffff

            // Look for a match in the hashtable. NOTE: remove one; see below.
            mIndex = hashTable[hash] - 1

            // Put pos in hash table. NOTE: add one so that zero = invalid.
            hashTable[hash] = sIndex + 1

            // Determine if there is a match (within range.)
            if (mIndex < 0 || ((sIndex - mIndex) >>> 16) > 0 || util.readU32(src, mIndex) !== seq) {
                mStep = searchMatchCount++ >> skipTrigger
                sIndex += mStep
                continue
            }

            searchMatchCount = (1 << skipTrigger) + 3

            // Calculate literal count and offset.
            literalCount = sIndex - mAnchor
            mOffset = sIndex - mIndex

            // We've already matched one word, so get that out of the way.
            sIndex += minMatch
            mIndex += minMatch

            // Determine match length.
            // N.B.: mLength does not include minMatch, Lz4 adds it back
            // in decoding.
            mLength = sIndex
            while (sIndex < sEnd - searchLimit && src[sIndex] === src[mIndex]) {
                sIndex++
                mIndex++
            }
            mLength = sIndex - mLength

            // Write token + literal count.
            var token = mLength < mlMask ? mLength : mlMask
            if (literalCount >= runMask) {
                dst[dIndex++] = (runMask << mlBits) + token
                for (n = literalCount - runMask; n >= 0xff; n -= 0xff) {
                    dst[dIndex++] = 0xff
                }
                dst[dIndex++] = n
            } else {
                dst[dIndex++] = (literalCount << mlBits) + token
            }

            // Write literals.
            for (var i = 0; i < literalCount; i++) {
                dst[dIndex++] = src[mAnchor + i]
            }

            // Write offset.
            dst[dIndex++] = mOffset
            dst[dIndex++] = (mOffset >> 8)

            // Write match length.
            if (mLength >= mlMask) {
                for (n = mLength - mlMask; n >= 0xff; n -= 0xff) {
                    dst[dIndex++] = 0xff
                }
                dst[dIndex++] = n
            }

            // Move the anchor.
            mAnchor = sIndex
        }
    }

    //   // Nothing was encoded.
    //   if (mAnchor === 0) {
    //     return 0;
    //   }

    // Write remaining literals.
    // Write literal token+count.
    literalCount = sEnd - mAnchor
    if (literalCount >= runMask) {
        dst[dIndex++] = (runMask << mlBits)
        for (n = literalCount - runMask; n >= 0xff; n -= 0xff) {
            dst[dIndex++] = 0xff
        }
        dst[dIndex++] = n
    } else {
        dst[dIndex++] = (literalCount << mlBits)
    }

    // Write literals.
    sIndex = mAnchor
    while (sIndex < sEnd) {
        dst[dIndex++] = src[sIndex++]
    }

    return dIndex
}
