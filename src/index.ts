// git clone https://github.com/PixarAnimationStudios/OpenUSD.git
// pxr/usd/sdf/crateFile.h
import { compressBound, decompressBlock } from "lz4js"
import { hexdump } from "./detail/hexdump.ts"
import { Path } from "./path/Path.ts"
import type { Reader } from "./crate/Reader.ts"

type Index = number
export type StringIndex = Index
export type TokenIndex = Index



// src/integerCoding.cpp: _DecompressIntegers(...)
export function readCompressedInts(reader: Reader, numInts: number) {
    const compressedSize = reader.getUint64()
    // console.log(`readCompressedInts(): n=${numInts}, compressedSize=${compressedSize}`)

    const uncompressed = Buffer.alloc(numInts * 4)
    const compressed = new Uint8Array(reader._dataview.buffer, reader.offset, compressedSize)
    reader.offset += compressedSize

    const decompSz = decompressFromBuffer(compressed, uncompressed)

    return decodeIntegers(new DataView(uncompressed.buffer), numInts)
}

interface ARG {
    src: DataView
    result: number[]
    output: number
    codesIn: number
    vintsIn: number
    commonValue: number
    prevVal: number
}

function decodeNHelper(N: number, arg: ARG) {
    enum Code { Common, Small, Medium, Large };
    const codeByte = arg.src.getUint8(arg.codesIn++)
    // console.log(`decodeNHelper(N=${N}): codeByte=${codeByte}`)
    for (let i = 0; i != N; ++i) {
        const x = (codeByte & (3 << (2 * i))) >> (2 * i)
        switch (x) {
            default:
            case Code.Common:
                arg.prevVal += arg.commonValue
                break
            case Code.Small:
                arg.prevVal += arg.src.getInt8(arg.vintsIn)
                arg.vintsIn += 1
                break
            case Code.Medium:
                arg.prevVal += arg.src.getInt16(arg.vintsIn)
                arg.vintsIn += 2
                break
            case Code.Large:
                arg.prevVal += arg.src.getInt32(arg.vintsIn)
                arg.vintsIn += 4
                break
        }
        arg.prevVal &= 0xffffffff
        // console.log(`  i=${i}, x=${x}, prevVal=${arg.prevVal} []`)
        arg.result[arg.output++] = arg.prevVal
    }
}

export function decodeIntegers(src: DataView, numInts: number) {
    // console.log("decodeIntegers() >>>>>>>>>>>>>>>>>>>>>>>>>>")

    // const src = new DataView(uncompressed)
    const commonValue = src.getUint32(0, true)
    // console.log(`commonValue = ${commonValue}`)

    const numCodesBytes = (numInts * 2 + 7) / 8
    let prevVal = 0
    let intsLeft = numInts

    const arg: ARG = {
        src,
        result: new Array(numInts),
        output: 0,
        codesIn: 4,
        vintsIn: 4 + numCodesBytes,
        commonValue,
        prevVal
    }
    while (intsLeft >= 4) {
        decodeNHelper(4, arg)
        intsLeft -= 4
    }
    switch (intsLeft) {
        case 1:
        case 2:
        case 3:
            decodeNHelper(intsLeft, arg)
            break
        case 0:
        default:
            break
    };
    // hexdump(new Uint8Array(arg.result.buffer))
    // console.log("decodeIntegers() <<<<<<<<<<<<<<<<<<<<<<<<<<")
    // for (let i = 0; i < arg.result.length; ++i) {
    //     console.log(`[${i}] = ${arg.result[i]}`)
    // }
    return arg.result
}

// // readfields 
// export function readCompressedInts(reader: Reader) {
//     const compSize = reader.getUint64()
// }

// OpenUSD/pxr/base/tf/fastCompression.cpp: TfFastCompression::DecompressFromBuffer(...)
// tinyusdz/src/lz4-compression.cc: LZ4Compression::DecompressFromBuffer(...)
export function decompressFromBuffer(src: Uint8Array, dst: Uint8Array) {
    const nChunks = src.at(0)
    if (nChunks === 0) {
        const n = decompressBlock(src, dst, 1, src.byteLength - 1, 0)
        if (n < 0) {
            throw Error("Failed to decompress data, possibly corrupt?")
        }
        return n
    } else {
        throw Error("yikes")
    }
}
