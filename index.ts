// git clone https://github.com/PixarAnimationStudios/OpenUSD.git
// pxr/usd/sdf/crateFile.h
import { decompressBlock } from "lz4js"
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
    private _buffer: Uint8Array
    private _offset: number
    constructor(buffer: Uint8Array, offset: number) {
        this._buffer = buffer
        this._offset = offset
    }
    getType() { return this._buffer.at(this._offset + 6) }
    isArray() { return (this._buffer.at(this._offset + 7)! & 128) !== 0 }
    isInlined() { return (this._buffer.at(this._offset + 7)! & 64) !== 0 }
    isCompressed() { return (this._buffer.at(this._offset + 7)! & 32) !== 0 }
    getPayload() {
        const d = new DataView(this._buffer.buffer)
        return d.getBigUint64(this._offset, true) & 0xffffffffffffn
    }
    toString() {
        return `ty: ${this.getType()}(xxx), isArray: ${this.isArray()}, isInlined: ${this.isInlined()}, isCompressed:${this.isCompressed()}, payload: ${this.getPayload()}`
    }
}

class Field {
    tokenIndex: TokenIndex
    valueRep: ValueRep
    constructor(tokenIndex: number, valueRep: ValueRep) {
        this.tokenIndex = tokenIndex
        this.valueRep = valueRep
    }
    toString(tokens?: string[]) {
        return `{ token_index = ${this.tokenIndex} ${tokens ? ` (${tokens[this.tokenIndex]})` : ''}}, value_rep=${this.valueRep} }`
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
        this.readFieldSets(reader)
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
        const section = this.toc.sections.get(SectionName.FIELDS)
        if (section === undefined) {
            return
        }
        reader.offset = section.start
        const numFields = reader.getUint64()

        const indices = readCompressedInts(reader, numFields)

        const reps_size = reader.getUint64()
        const uncompressedSize = numFields * 8
        const compressed = new Uint8Array(reader._dataview.buffer, reader.offset, reps_size)
        const uncompressed = new Uint8Array(uncompressedSize)
        if (uncompressedSize !== decompressFromBuffer(compressed, uncompressed)) {
            throw Error("Failed to read Fields ValueRep data.")
        }

        this.fields = new Array(numFields)
        for (let i = 0; i < numFields; ++i) {
            this.fields[i] = new Field(indices[i], new ValueRep(uncompressed, i * 8))
        }

        for (let i = 0; i < numFields; ++i) {
            console.log(`fields[${i}] = ${this.fields[i].toString(this.tokens)}`)
        }

        // if (section.start + section.size !== reader.offset) {
        //     throw Error(`FIELDS: not at end: expected end at ${section.start + section.size} but reader is at ${reader.offset}`)
        // }
    }

    readFieldSets(reader: Reader) {
        const section = this.toc.sections.get(SectionName.FIELDSETS)
        if (section === undefined) {
            return
        }
        reader.offset = section.start
        const numFieldSets = reader.getUint64()
        // ...
    }
}

// src/integerCoding.cpp: _DecompressIntegers(...)
export function readCompressedInts(reader: Reader, numInts: number) {
    const compressedSize = reader.getUint64()
    console.log(`readCompressedInts(): n=${numInts}, compressedSize=${compressedSize}`)

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
