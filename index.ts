// git clone https://github.com/PixarAnimationStudios/OpenUSD.git
// pxr/usd/sdf/crateFile.h
import { readFileSync } from "fs"
import { decompress, decompressBlock, decompressFrame } from "lz4js"
import { hexdump } from "./hexdump.ts"

type Index = number
type StringIndex = Index
type TokenIndex = Index

export class Reader {
    _dataview: DataView

    offset = 0
    constructor(dataview: DataView) {
        this._dataview = dataview
    }
    get byteLength() {
        return this._dataview.byteLength
    }
    getString(max: number) {
        let value = ""
        for (let i = 0; i <= _SectionNameMaxLength; ++i) {
            const c = this._dataview.getUint8(this.offset + i)
            if (c === 0) {
                break
            }
            value += String.fromCharCode(c)
        }
        this.offset += max
        return value
    }
    getUint8() {
        return this._dataview.getUint8(this.offset++)
    }
    getUint32() {
        const value = this._dataview.getUint32(this.offset, true)
        this.offset += 4
        return value
    }
    getUint64() {
        const value = new Number(this._dataview.getBigUint64(this.offset, true)).valueOf()
        this.offset += 8
        return value
    }
}

class BootStrap {
    indent: string
    version: {
        major: number,
        minor: number,
        patch: number
    }
    tocOffset: number
    constructor(reader: Reader) {
        this.indent = reader.getString(8)
        if (this.indent !== "PXR-USDC") {
            throw Error("Not a Pixar Universal Screen Description Crate (USDC) file")
        }

        this.version = {
            major: reader.getUint8(),
            minor: reader.getUint8(),
            patch: reader.getUint8()
        }
        reader.offset += 5

        this.tocOffset = reader.getUint64()
    }
}

class TableOfContents {
    sections = new Map<string, Section>()
    constructor(reader: Reader) {
        const n = reader.getUint64()
        for (let i = 0; i < n; ++i) {
            const section = new Section(reader)
            this.sections.set(section.name, section)
        }
    }
}

const SectionName = {
    TOKENS: "TOKENS",
    STRINGS: "STRINGS",
    FIELDS: "FIELDS",
    FIELDSETS: "FIELDSETS",
    PATHS: "PATHS",
    SPECS: "SPECS"
}

const _SectionNameMaxLength = 15
class Section {
    name: string
    start: number
    size: number

    constructor(reader: Reader) {
        this.name = reader.getString(16)
        this.start = reader.getUint64()
        this.size = reader.getUint64()
    }
}

// 8 octets
// Value in file representation.  Consists of a 2 bytes of type information
// (type enum value, array bit, and inlined-value bit) and 6 bytes of data.
// If possible, we attempt to store certain values directly in the local
// data, such as ints, floats, enums, and special-case values of other types
// (zero vectors, identity matrices, etc).  For values that aren't stored
// inline, the 6 data bytes are the offset from the start of the file to the
// value's location.
class ValueRep {
    private _offset: number
    constructor(reader: Reader) {
        this._offset = reader.offset
        reader.offset += 8
    }
}

class Field {
    tokenIndex: TokenIndex
    valueRep: ValueRep
    constructor(reader: Reader) {
        reader.offset += 4
        this.tokenIndex = reader.getUint32()
        this.valueRep = new ValueRep(reader)

        // console.log(this)
    }
}

export class CrateFile {
    bootstrap: BootStrap
    toc: TableOfContents

    tokens?: string[]
    strings?: StringIndex[]
    fields?: Field[]
    // fieldsets
    // paths
    // specs

    constructor(reader: Reader) {
        this.bootstrap = new BootStrap(reader)
        reader.offset = this.bootstrap.tocOffset
        this.toc = new TableOfContents(reader)
        this.readTokens(reader)
        this.readStrings(reader)
        this.readFields(reader)

        // if (this.tokens && this.fields) {
        //     for(const field of this.fields) {
        //         console.log(field.tokenIndex)
        //         // console.log(this.tokens[field.tokenIndex])
        //     }
        // }
    }

    readTokens(reader: Reader) {
        const section = this.toc.sections.get(SectionName.TOKENS)
        if (section === undefined) {
            return
        }
        reader.offset = section.start
        const numTokens = reader.getUint64()
        const uncompressedSize = reader.getUint64()
        const compressedSize = reader.getUint64()

        if (compressedSize > section.size - 24) {
            throw Error(`TOKENS section: compressed size exceeds section`)
        }

        const compressed = new Uint8Array(reader._dataview.buffer, reader.offset, compressedSize)
        const uncompressed = new Uint8Array(uncompressedSize)
        const n = decompressFromBuffer(compressed, uncompressed)
        if (n !== uncompressedSize) {
            throw Error(`CrateFile::readTokens(): failed to decompress: uncompressed ${n} but excepted ${uncompressedSize}`)
        }

        this.tokens = new Array<string>(numTokens)

        let name = ""
        let tokenIndex = 0
        for (let i = 0; i < uncompressedSize; ++i) {
            const c = uncompressed[i]
            if (c === 0) {
                if (tokenIndex >= numTokens) {
                    throw Error(`too many tokens`)
                }
                this.tokens[tokenIndex] = name
                ++tokenIndex
                name = ""
            } else {
                name += String.fromCharCode(c)
            }
        }
        if (numTokens !== tokenIndex) {
            throw Error(`not enough tokens`)
        }
    }

    readStrings(reader: Reader) {
        const section = this.toc.sections.get(SectionName.STRINGS)
        if (section === undefined) {
            return
        }
        reader.offset = section.start
        const n = reader.getUint64()
        this.strings = new Array(n)
        for (let i = 0; i < n; ++i) {
            this.strings[i] = reader.getUint32()
        }
        if (section.start + section.size !== reader.offset) {
            throw Error(`STRINGS: not at end: expected end at ${section.start + section.size} but reader is at ${reader.offset}`)
        }
    }

    readFields(reader: Reader) {
        // content is compressed!!!
        const section = this.toc.sections.get(SectionName.FIELDS)
        if (section === undefined) {
            return
        }
        reader.offset = section.start
        const numFields = reader.getUint64()
        console.log(`numFields = ${numFields}`)
        // this.fields = new Array(numFields)
        readCompressedInts(reader, numFields)
        // for (let i = 0; i < numFields; ++i) {
        //     // this.fields[i] = new Field(reader)
        // }
        // if (section.start + section.size !== reader.offset) {
        //     throw Error(`FIELDS: not at end: expected end at ${section.start + section.size} but reader is at ${reader.offset}`)
        // }
    }
}

// src/integerCoding.cpp: _DecompressIntegers(...)
function readCompressedInts(reader: Reader, numInts: number) {
    const compressedSize = reader.getUint64()
    console.log(`readCompressedInts(): n=${numInts}, compressedSize=${compressedSize}`)

    const uncompressed = Buffer.alloc(4096)
    const b = reader._dataview.buffer.slice(reader.offset, reader.offset + compressedSize - 1)

    hexdump(new Uint8Array(Buffer.from(b)))

    // const decompSz = decodeBlock(Buffer.from(b), uncompressed)
    // console.log(`decompSz = ${decompSz}`)

    // LZ4 decompression
    // _DecodeIntegers(...)
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

// https://github.com/lighttransport/tinyusdz
// mkdir build
// cd build
// cmake ..
// make -j12
// ./tusdcat /Users/mark/js/usd/cube.usdc

function main() {
    // const data = "hello world. hello world. hello world. hello world. hello world."
    // var input = Buffer.from(data)
    // // Initialize the output buffer to its maximum length based on the input data
    // var output = Buffer.alloc(encodeBound(input.length))

    // // block compression (no archive format)
    // var compressedSize = encodeBlock(input, output)
    // // remove unnecessary bytes
    // output = output.slice(0, compressedSize)
    // console.log(`compressedSize=${compressedSize}`)

    // var uncompressed = Buffer.alloc(input.length)
    // var uncompressedSize = decodeBlock(output, uncompressed)
    // uncompressed = uncompressed.slice(0, uncompressedSize)
    // console.log(`uncompressedSize=${uncompressedSize}`)

    const buffer = readFileSync("cube.usdc")
    const data = new DataView(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
    const reader = new Reader(data)

    new CrateFile(reader)


}

// main()



// main()