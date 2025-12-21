//
// copied on 2025-11-30 from https://github.com/Benzinga/lz4js
//                           copyright 2018 John Chadwick, licensed under ISC
// with the following changes
// * compressBlock():
//   * fix: return something when input which can't be compressed
//   * fix: increase size of remaining literals to compatible with lz4.org's decompressBlock()
//   * added comments
//   * use capital letters for constants
//   * remove hashtable argument
// * decompressBlock()
//   * add additional restrictions from lz4.org to validate compressBlock()'s correctness

// Compression format parameters/constants.
const LZ4_MIN_MATCH = 4 // we are looking for matches of at least 4 bytes
const LZ4_MIN_LENGTH = 13 // don't compress when input is less than 13 bytes
const LZ4_SEARCH_LIMIT = 5
const LZ4_SKIP_TRIGGER = 6
const LZ4_HASH_TABLE_SIZE = 1 << 16 // hash table has space for uint32_t entries (64k entries)

// Token constants.
const LZ4_ML_BITS = 4
const LZ4_ML_MASK = (1 << LZ4_ML_BITS) - 1
const LZ4_RUN_BITS = 4
const LZ4_RUN_MASK = (1 << LZ4_RUN_BITS) - 1

// Shared buffers
const hashTable = new Uint32Array(LZ4_HASH_TABLE_SIZE)

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
        let x = b[n++] << 0
        x |= b[n++] << 8
        x |= b[n++] << 16
        x |= b[n++] << 24
        return x
    }
}

export function decompressBlock(src: Uint8Array, dst: Uint8Array, sIndex: number, sLength: number, dIndex: number) {
    let mLength, mOffset, sEnd, n, i

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

        // additional condition from lz4.c not needed for this implementation
        {
            const ip = sIndex - literalCount
            const op = dIndex - literalCount
            const length = literalCount
            const cpy = op + length
            const oend = dst.buffer.byteLength
            const iend = sEnd
            const MFLIMIT = 12
            const LASTLITERALS = 5
            // if end of output or input buffer
            if ((cpy > oend - MFLIMIT) || (ip + length > iend - (2 + 1 + LASTLITERALS))) {
                /* We must be on the last sequence (or invalid) because of the parsing limitations
                 * so check that we exactly consume the input and don't overrun the output buffer.
                 */
                if ((ip + length != iend) || (cpy > oend)) {
                    return -ip - 1
                }
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

        mLength += LZ4_MIN_MATCH

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

/**
 * compress src into dst
 * 
 * @param src 
 * @param dst 
 * @param sIndex 
 * @param sLength 
 * @returns size of compressed data in dst
 */
export function compressBlock(src: Uint8Array, dst: Uint8Array, sIndex: number, sLength: number) {

    var mIndex, mAnchor, mLength, mOffset //, mStep = 1
    var literalCount, dIndex, sEnd, n

    // Setup initial state.
    dIndex = 0              // destination index for output
    sEnd = sLength + sIndex // end of source
    mAnchor = sIndex        // match anchor: position after which there wasn't a match yet

    // Process only if block is large enough.
    if (sLength >= LZ4_MIN_LENGTH) {
        hashTable.fill(0)
        let searchMatchNb = (1 << LZ4_SKIP_TRIGGER) + 3

        // Consume until last n literals (Lz4 spec limitation.)
        // while (sIndex + LZ4_MIN_MATCH < sEnd - LZ4_SEARCH_LIMIT) { // 4 5 2 = 11
        while (sIndex + LZ4_MIN_MATCH < sEnd - LZ4_SEARCH_LIMIT - 2) {
            var seq = util.readU32(src, sIndex)
            // console.log(`step=${mStep}, searchMatchNb=${searchMatchNb}, seq[${sIndex.toString().padStart(4, ' ')}] = 0x${seq.toString(16).padStart(8, '0')}`)
            var hash = util.hashU32(seq) >>> 0

            // Crush hash to 16 bits.
            hash = ((hash >> 16) ^ hash) >>> 0 & 0xffff

            // Look for a match in the hashtable. NOTE: remove one; see below.
            mIndex = hashTable[hash] - 1

            // Put pos in hash table. NOTE: add one so that zero = invalid.
            hashTable[hash] = sIndex + 1

            // Determine if there is a match (within range.)
            // continue looking for a match when
            if (mIndex < 0                              // seq not found in hashtable
                || ((sIndex - mIndex) >>> 16) > 0       // OR distance between match and source exceeds 16 bits
                || util.readU32(src, mIndex) !== seq)   // OR value referenced by hashtable actually differs
            {
                // speed up search the longer the search takes
                const mStep = searchMatchNb++ >> LZ4_SKIP_TRIGGER
                sIndex += mStep
                continue // keep looking for match
            }
            // console.log(`matched sequence with earlier one at ${mIndex}`)

            searchMatchNb = (1 << LZ4_SKIP_TRIGGER) + 3

            // Calculate literal count and offset.
            literalCount = sIndex - mAnchor // number of bytes since the last match
            mOffset = sIndex - mIndex       // offset from current source position to the matched position

            // We've already matched one word, so get that out of the way.
            sIndex += LZ4_MIN_MATCH
            mIndex += LZ4_MIN_MATCH

            // Determine match length.
            // N.B.: mLength does not include minMatch, Lz4 adds it back in decoding.
            // console.log(`compare match at mIndex=${mIndex} with at sIndex=${sIndex}`)
            mLength = sIndex // sIndex when starting to calculate length
            while (sIndex < sEnd - LZ4_SEARCH_LIMIT && src[sIndex] === src[mIndex]) {
                sIndex++
                mIndex++
            }
            // console.log(`sIndex=${sIndex}, mIndex=${mIndex}`)
            mLength = sIndex - mLength // sIndex after calculating length - sIndex when starting calculating length

            // write token containing the lengths
            // console.log(`literalsToFollow := mLength ${mLength} < mlMask ${LZ4_ML_MASK} ? mLength : mlMask`)
            var literalsToFollow = mLength < LZ4_ML_MASK ? mLength : LZ4_ML_MASK
            if (literalCount >= LZ4_RUN_MASK) {
                // console.log(`dst[${dIndex}] := token: 0x${LZ4_RUN_MASK.toString(16)}${literalsToFollow.toString(16)}`)
                dst[dIndex++] = (LZ4_RUN_MASK << LZ4_ML_BITS) + literalsToFollow
                for (n = literalCount - LZ4_RUN_MASK; n >= 0xff; n -= 0xff) {
                    // console.log(`dst[${dIndex}] := token: 0xff`)
                    dst[dIndex++] = 0xff
                }
                // console.log(`dst[${dIndex}] := token: 0x${n.toString(16).padStart(2, '0')}`)
                dst[dIndex++] = n
            } else {
                // console.log(`dst[${dIndex}] := token: ${literalCount.toString(16)} / ${literalsToFollow.toString(16)}`)
                dst[dIndex++] = (literalCount << LZ4_ML_BITS) + literalsToFollow
            }

            // copy literals inside which the match was found
            for (var i = 0; i < literalCount; i++) {
                dst[dIndex++] = src[mAnchor + i]
            }

            // write offset where to find the match relative to current position
            dst[dIndex++] = mOffset
            dst[dIndex++] = (mOffset >> 8)

            // write length of the match
            if (mLength >= LZ4_ML_MASK) {
                for (n = mLength - LZ4_ML_MASK; n >= 0xff; n -= 0xff) {
                    dst[dIndex++] = 0xff
                }
                dst[dIndex++] = n
            }

            // move the anchor
            mAnchor = sIndex
        }
    }

    // write remaining literals for which no match was found

    // write token with the length
    literalCount = sEnd - mAnchor
    // console.log(`literalCount=${literalCount}`)
    if (literalCount >= LZ4_RUN_MASK) {
        dst[dIndex++] = (LZ4_RUN_MASK << LZ4_ML_BITS)
        for (n = literalCount - LZ4_RUN_MASK; n >= 0xff; n -= 0xff) {
            dst[dIndex++] = 0xff
        }
        dst[dIndex++] = n
    } else {
        dst[dIndex++] = (literalCount << LZ4_ML_BITS)
    }

    // copy the remaining literals
    sIndex = mAnchor
    while (sIndex < sEnd) {
        dst[dIndex++] = src[sIndex++]
    }

    return dIndex
}
