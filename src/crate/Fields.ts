import { compressToBuffer, decompressFromBuffer } from "../compression/compress"
import { CrateDataType, ListOpHeader } from "./CrateDataType"
import { Field } from "./Field"
import { compressBound } from "../compression/lz4"
import { Reader } from "./Reader.js"
import type { Specifier } from "./Specifier"
import type { Strings } from "./Strings"
import type { Tokens } from "./Tokens"
import { kMinCompressedArraySize, ValueRep } from "./ValueRep"
import type { Variability } from "./Variability"
import { Writer } from "./Writer.js"
import { UsdNode } from "../nodes/usd/UsdNode.js"
import { ListOp } from "./ListOp"

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

            const fieldNameTokenIndices = reader.getCompressedIntegers(numFields)

            // decompress ValueReps
            const compressedSize = reader.getUint64()
            const uncompressedSize = numFields * 8
            const compressed = new Uint8Array(reader._dataview.buffer, reader.offset, compressedSize)
            const uncompressed = new Uint8Array(uncompressedSize)
            if (uncompressedSize !== decompressFromBuffer(compressed, uncompressed)) {
                throw Error("Failed to read Fields ValueRep data.")
            }

            // create fields
            const valueRepBuffer = new DataView(uncompressed.buffer)
            this.fields = new Array(numFields)
            for (let field = 0; field < numFields; ++field) {
                this.fields[field] = new Field(fieldNameTokenIndices[field], new ValueRep(valueRepBuffer, field * 8))
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
    setInt(name: string, value: number) {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeInt32(value)
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.Int)
        this.valueReps.writeUint8(IsInlinedBit)
        return idx
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
    setAssetPath(name: string, value: string) {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeUint32(this.tokens.add(value))
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.AssetPath)
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
    setTokenArray(name: string, value: string[]) {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeUint32(this.data.tell())
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.Token)
        this.valueReps.writeUint8(IsArrayBit_)

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
    setTokenListOp(name: string, value: ListOp<string>) {
        return this._setListOp(name, value, CrateDataType.TokenListOp)
    }
    setPathListOp(name: string, value: ListOp<UsdNode>) {
        return this._setListOp(name, value, CrateDataType.PathListOp)
    }
    _setListOp(name: string, value: ListOp<string | number | UsdNode>, type: CrateDataType) {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        const offset = this.data.tell()
        // if (value.explicit && value.explicit[0] instanceof UsdNode) {
        //     console.log(`ValueRep(): write ListOp<UsdNode> @ ${offset}`)
        // }
        this.valueReps.writeUint32(this.data.tell())
        this.valueReps.skip(2)
        this.valueReps.writeUint8(type)
        this.valueReps.writeUint8(0)

        const hdr = new ListOpHeader(this.data, value)
        // console.log(hdr.toString())

        const write = (list?: (string | number | UsdNode)[]) => {
            if (list === undefined) {
                return
            }
            this.data.writeUint64(list.length)
            for (const v of list) {
                switch (typeof v) {
                    case "string":
                        this.data.writeUint32(this.tokens.add(v))
                        break
                    case "number":
                        this.data.writeUint32(v)
                        break
                    case "object":
                        const o = v as object
                        if (o instanceof UsdNode) {
                            // console.log(`_setListOp(${name}, ${o.index} %o)`, o.toJSON())
                            if (o.index === -1) {
                                throw Error(`Fields._setListOp("${name}", ...): object ${o.getFullPathName()} has no index yet`)
                                // console.log(`Fields._setListOp("${name}", ...): object ${o.getFullPathName()} has no index yet`)
                            }
                            this.data.writeUint32(o.index)
                        } else {
                            throw Error("yikes")
                        }
                        break
                }
            }
        }

        write(value.explicit)
        write(value.add)
        write(value.prepend)
        write(value.append)
        write(value.delete)
        write(value.order)

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
        if (value.length < kMinCompressedArraySize) {
            this.valueReps.writeUint8(IsArrayBit_)
            this.data.writeUint64(value.length)
            for (let i = 0; i < value.length; ++i) {
                this.data.writeInt32(value[i])
            }
        } else {
            this.valueReps.writeUint8(IsArrayBit_ | IsCompressedBit)
            this.data.writeCompressedIntegers(value)
        }
        return idx
    }
    setVec2f(name: string, value: ArrayLike<number>): number {
        return this.setVecXf(name, value, CrateDataType.Vec2f, 2)
    }
    setVec3f(name: string, value: ArrayLike<number>): number {
        return this.setVecXf(name, value, CrateDataType.Vec3f, 3)
    }
    setVec4f(name: string, value: ArrayLike<number>): number {
        return this.setVecXf(name, value, CrateDataType.Vec4f, 4)
    }
    private setVecXf(name: string, value: ArrayLike<number>, type: CrateDataType, n: number): number {
        if (value.length < n) {
            throw Error(`setVec${n}f('${name}', value: number[3]): value too small`)
        }
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))

        let canInline = true
        for (let i = 0; i < n; ++i) {
            if (Math.round(value[i]) !== value[i] || value[i] < -128 || value[i] > 127) {
                canInline = false
                break
            }
        }

        if (canInline) {
            for (let i = 0; i < n; ++i) {
                this.valueReps.writeUint8(value[i])
            }
            for (let i = n; i < 4; ++i) {
                this.valueReps.writeUint8(0)
            }
            this.valueReps.skip(2)
            this.valueReps.writeUint8(type)
            this.valueReps.writeUint8(IsInlinedBit)
        } else {
            this.valueReps.writeUint32(this.data.tell())
            this.valueReps.skip(2)
            this.valueReps.writeUint8(type)
            this.valueReps.writeUint8(0)
            for (let i = 0; i < n; ++i) {
                this.data.writeFloat32(value[i])
            }
        }
        return idx
    }
    setVec3d(name: string, value: ArrayLike<number>): number {
        if (value.length < 3) {
            throw Error(`setVec3d('${name}', value: number[3]): value too small`)
        }
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        if (Math.round(value[0]) == value[0]
            && Math.round(value[1]) == value[1]
            && Math.round(value[2]) == value[2]) {
            this.valueReps.writeUint8(value[0])
            this.valueReps.writeUint8(value[1])
            this.valueReps.writeUint8(value[2])
            this.valueReps.writeUint8(0)
            this.valueReps.skip(2)
            this.valueReps.writeUint8(CrateDataType.Vec3d)
            this.valueReps.writeUint8(IsInlinedBit)
        } else {
            this.valueReps.writeUint32(this.data.tell())
            this.valueReps.skip(2)
            this.valueReps.writeUint8(CrateDataType.Vec3d)
            this.valueReps.writeUint8(0)
            for (let i = 0; i < 3; ++i) {
                this.data.writeFloat64(value[i])
            }
        }
        return idx
    }
    setMatrix4d(name: string, value: ArrayLike<number>): number {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeUint32(this.data.tell())
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.Matrix4d)
        this.valueReps.writeUint8(0)
        for (let i = 0; i < 16; ++i) {
            this.data.writeFloat64(value[i])
        }
        return idx
    }
    setMatrix4dArray(name: string, value: ArrayLike<number>): number {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeUint32(this.data.tell())
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.Matrix4d)
        this.valueReps.writeUint8(IsArrayBit_)

        this.data.writeUint64(value.length / 16)
        for (let i = 0; i < value.length; ++i) {
            this.data.writeFloat64(value[i])
        }
        return idx
    }
    setVec3fArray(name: string, value: ArrayLike<number>): number {
        if (value.length / 3 != Math.round(value.length / 3)) {
            throw Error("Vec3fArray must be a multiple of 3")
        }

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
        if (value.length / 2 != Math.round(value.length / 2)) {
            throw Error("Vec2fArray must be a multiple of 2")
        }

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
    setFloatArray(name: string, value: ArrayLike<number>): number {
        const idx = this.valueReps.tell() / 8
        this.tokenIndices.push(this.tokens.add(name))
        this.valueReps.writeUint32(this.data.tell())
        this.valueReps.skip(2)
        this.valueReps.writeUint8(CrateDataType.Float)
        this.valueReps.writeUint8(IsArrayBit_)

        this.data.writeUint64(value.length)
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
