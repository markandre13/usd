import { compressToBuffer, decompressFromBuffer } from "../index.ts"
import { CrateDataType } from "./CrateDataType.ts"
import { Field } from "./Field.ts"
import { compressBound } from "./lz4.ts"
import { Reader } from "./Reader.js"
import { SectionName } from "./SectionName.ts"
import type { Specifier } from "./Specifier.ts"
import type { Strings } from "./Strings.ts"
import type { TableOfContents } from "./TableOfContents.ts"
import type { Tokens } from "./Tokens.ts"
import { ValueRep } from "./ValueRep.ts"
import { Writer } from "./Writer.js"

const IsArrayBit_ = 128
const IsInlinedBit = 64
const IsCompressedBit = 32

export class Fields {
    tokenIndices: number[] = []
    data!: Writer
    fields?: Field[]

    valueReps = new Writer()
    offset = 0

    private tokens!: Tokens
    private strings!: Strings

    constructor(reader: Reader)
    constructor(tokens: Tokens, strings: Strings, data: Writer)
    constructor(tokensOrReader: Tokens | Reader, strings?: Strings, data?: Writer) {
        if (tokensOrReader instanceof Reader) {
            const reader = tokensOrReader
            const numFields = reader.getUint64()

            const indices = reader.getCompressedIntegers(numFields)

            // ValueReps
            const compressedSize = reader.getUint64()
            const uncompressedSize = numFields * 8
            const compressed = new Uint8Array(reader._dataview.buffer, reader.offset, compressedSize)
            const uncompressed = new Uint8Array(uncompressedSize)
            if (uncompressedSize !== decompressFromBuffer(compressed, uncompressed)) {
                throw Error("Failed to read Fields ValueRep data.")
            }

            // create fields
            const dataview = new DataView(uncompressed.buffer)
            this.fields = new Array(numFields)
            for (let field = 0; field < numFields; ++field) {
                this.fields[field] = new Field(indices[field], new ValueRep(dataview, field * 8))
            }

            // for (let i = 0; i < numFields; ++i) {
            //     console.log(`fields[${i}] = ${this.fields[i].toString(this.tokens)}`)
            // }
            // if (section.start + section.size !== reader.offset) {
            //     throw Error(`FIELDS: not at end: expected end at ${section.start + section.size} but reader is at ${reader.offset}`)
            // }
        } else {
            this.tokens = tokensOrReader
            this.strings = strings!
            this.data = data!
        }
    }
    setFloat(name: string, value: number) {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        // ValueRep

        this.valueReps.writeFloat32(value)
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.Float)
        this.valueReps.writeUint8(IsInlinedBit)
        return idx
    }
    setToken(name: string, value: string) {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeUint32(this.tokens.add(value))
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.Token)
        this.valueReps.writeUint8(IsInlinedBit)
        return idx
    }
    setTokenVector(name: string, value: string[]) {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeUint32(this.data.tell())
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.TokenVector)
        this.valueReps.writeUint8(0)

        this.data.writeUint64(value.length)
        for (const v of value) {
            this.data.writeUint32(this.tokens.add(v))
        }
        return idx
    }
    setSpecifier(name: string, value: Specifier) {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeUint32(value)
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.Specifier)
        this.valueReps.writeUint8(IsInlinedBit)
        return idx
    }
    setString(name: string, value: string) {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeUint32(this.strings.add(value))
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.String)
        this.valueReps.writeUint8(IsInlinedBit)
        return idx
    }
    setIntVector(name: string, value: number[]): number {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeUint32(this.data.tell())
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.Int)
        this.valueReps.writeUint8(IsArrayBit_)

        this.data.writeUint64(value.length)
        for (const v of value) {
            this.data.writeInt32(v)
        }
        return idx
    }
    serialize(writer: Writer) {
        // const numFields = this.tokenIndices.length
        // writer.writeUint64(numFields) // done in writeCompresedInt

        writer.writeCompressedIntegers(this.tokenIndices)

        const compressed = new Uint8Array(compressBound(this.valueReps.buffer.byteLength) + 1)
        const compresedSize = compressToBuffer(new Uint8Array(this.valueReps.buffer), compressed)
        writer.writeUint64(compresedSize)
        writer.writeBuffer(compressed, 0, compresedSize)
    }
}
