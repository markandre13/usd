import { compressToBuffer, decompressFromBuffer } from "../index.ts"
import { CrateDataType } from "./CrateDataType.ts"
import { Field } from "./Field.ts"
import { compressBound } from "../compression/lz4.ts"
import { Reader } from "./Reader.js"
import type { Specifier } from "./Specifier.ts"
import type { Strings } from "./Strings.ts"
import type { Tokens } from "./Tokens.ts"
import { ValueRep } from "./ValueRep.ts"
import type { Variability } from "./Variability.ts"
import { Writer } from "./Writer.js"

const IsArrayBit_ = 128
const IsInlinedBit = 64
const IsCompressedBit = 32

export class Fields {
    tokenIndices: number[] = []
    data!: Writer
    fields?: Field[]

    valueReps = new Writer(undefined, "valuerep")
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
        this.valueReps.writeFloat32(value)
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.Float)
        this.valueReps.writeUint8(IsInlinedBit)
        return idx
    }
    setBoolean(name: string, value: boolean) {
        this.tokenIndices.push(this.tokens.add(name))
        return this._setBoolean(value)
    }
    _setBoolean(value: boolean) {
        return this.__setBoolean(this.valueReps, value)
    }
    __setBoolean(writer: Writer, value: boolean) {
        const idx = this.valueReps.tell() / 8
        writer.writeUint8(value ? 1 : 0)
        writer.skip(5)
        writer.writeUint8(CrateDataType.Bool)
        writer.writeUint8(IsInlinedBit)
        return idx
    }
    setDouble(name: string, value: number) {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeFloat32(value)
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.Double)
        this.valueReps.writeUint8(IsInlinedBit)
        return idx
    }
    setVariability(name: string, value: Variability) {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeUint32(value)
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.Variability)
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
    setDictionary(name: string, value: any) {
        this.tokenIndices.push(this.tokens.add(name))
        return this._setDictionary(value)
    }
    _setDictionary(value: any) {
        return this.__setDictionary(this.valueReps, this.data, value)
    }
    __setDictionary(writer0: Writer, writer1: Writer, value: any) {
        // console.log(`SET DICTIONARY:  %o`, value)

        const idx = writer0.tell() / 8
        // console.log(`${writer0.name}@${writer0.tell()}: dict -> offset ${writer1.tell()}`)
        // console.log(`__setDictionary() IN : writer0 valuerep @ ${writer0.tell()}`)

        // just in case writer0 and writer1 are the same, advance writer0 to find out where writer1 will begin
        const offset0 = writer0.tell()
        writer0.skip(8)
        const offset1 = writer1.tell()
        writer0.seek(offset0)

        writer0.writeUint32(offset1)
        writer0.skip(2)
        writer0.writeUint8(CrateDataType.Dictionary)
        writer0.writeUint8(0)

        const names = Object.getOwnPropertyNames(value)
        writer1.writeUint64(names.length)

        // console.log(`encode dict at ${offset0} of size ${names.length}, offset ${offset1.toString(16).padStart(4, '0')}`)

        const oldPos = writer1.tell()
        writer1.skip(names.length * (4 + 8))

        // write values at back
        const offsets: number[] = []
        for (const name of names) {
            // console.log(`${writer1.name}@0x${writer1.tell().toString(16).padStart(4, '0')} value ${name}`)
            offsets.push(writer1.tell())
            const v = value[name]
            switch (typeof v) {
                case "boolean":
                    this.__setBoolean(writer1, v)
                    break
                case "object":
                    this.__setDictionary(writer1, writer1, v)
                    break
                default:
                    throw Error(`yikes: type ${typeof v} not implemented yet`)
            }
        }

        // write names and offset at front
        const offsetEnd = writer1.tell()
        writer1.seek(oldPos)
        for (const name of names) {
            writer1.writeUint32(this.strings.add(name))
            writer1.writeUint64(offsets.shift()! - writer1.tell())
        }
        writer1.seek(offsetEnd)
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
    // TODO: this can be stored as compressed
    setIntArray(name: string, value: ArrayLike<number>): number {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeUint32(this.data.tell())
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.Int)
        this.valueReps.writeUint8(IsArrayBit_)

        this.data.writeUint64(value.length)
        for (let i = 0; i < value.length; ++i) {
            this.data.writeInt32(value[i])
        }
        return idx
    }
    setVec3fArray(name: string, value: ArrayLike<number>): number {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeUint32(this.data.tell())
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.Vec3f)
        this.valueReps.writeUint8(IsArrayBit_)

        this.data.writeUint64(value.length / 3)
        for (let i = 0; i < value.length; ++i) {
            this.data.writeFloat32(value[i])
        }
        return idx
    }
    setVec2fArray(name: string, value: ArrayLike<number>): number {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeUint32(this.data.tell())
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.Vec2f)
        this.valueReps.writeUint8(IsArrayBit_)

        this.data.writeUint64(value.length / 2)
        for (let i = 0; i < value.length; ++i) {
            this.data.writeFloat32(value[i])
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
