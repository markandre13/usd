// git clone https://github.com/PixarAnimationStudios/OpenUSD.git
// pxr/usd/sdf/crateFile.h
import { compressBlock, compressBound, decompressBlock } from "./lz4"

type Index = number
export type StringIndex = Index
export type TokenIndex = Index

// OpenUSD/pxr/base/tf/fastCompression.cpp: TfFastCompression::DecompressFromBuffer(...)
// tinyusdz/src/lz4-compression.cc: LZ4Compression::DecompressFromBuffer(...)
export function decompressFromBuffer(src: Uint8Array, dst: Uint8Array) {
    const nChunks = src.at(0)!
    if (nChunks > 127) {
        throw Error(`too many chunks`)
    }
    if (nChunks === 0) {
        const n = decompressBlock(src, dst, 1, src.byteLength - 1, 0)
        if (n < 0) {
            throw Error("Failed to decompress data, possibly corrupt?")
        }
        return n
    }
    throw Error("decompressFromBuffer(): chunks are not implemented yet")
}

export function compressToBuffer(src: Uint8Array, dst: Uint8Array) {
    const LZ4_MAX_INPUT_SIZE = 0x7E000000
    if (src.length < LZ4_MAX_INPUT_SIZE) {
        if (dst.length < compressBound(src.length) + 1) {
            throw Error(`compressToBuffer(): dst has ${dst.length} octets but at least ${compressBound(src.length) + 1} are needed`)
        }
        const skipFirstByte = new Uint8Array(dst.buffer, 1, dst.buffer.maxByteLength-1)
        const n = compressBlock(src, skipFirstByte, 0, src.byteLength)
        return n + 1
    }
    throw Error("compressToBuffer(): chunks are not implemented yet")
}
