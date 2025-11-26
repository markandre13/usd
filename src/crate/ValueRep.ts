// 8 octets
// Value in file representation.  Consists of a 2 bytes of type information
// (type enum value, array bit, and inlined-value bit) and 6 bytes of data.
// If possible, we attempt to store certain values directly in the local
// data, such as ints, floats, enums, and special-case values of other types
// (zero vectors, identity matrices, etc).  For values that aren't stored
// inline, the 6 data bytes are the offset from the start of the file to the

import { decodeIntegers, decompressFromBuffer } from "../index.ts"
import { CrateDataType, ListOpHeader } from "./CrateDataType.ts"
import type { CrateFile } from "./CrateFile.ts"
import { Specifier } from "./Specifier.ts"
import { UsdNode } from "./UsdNode.js"
import { Variability } from "./Variability.js"

// value's location.
// FIXME: last two bytes are type info
export class ValueRep {
    private _buffer: DataView
    private _offset: number
    constructor(buffer: DataView, offset: number) {
        this._buffer = buffer
        this._offset = offset
    }
    toJSON(node: UsdNode | CrateFile, key: string) {
        const v = node instanceof UsdNode ? this.getValue(node.crate) : this.getValue(node)
        if (v === undefined) {
            if (node instanceof UsdNode) {
                console.log(`ValueRep.getValue(): for ${node.getFullPathName()}.${key} not implemented yet: type: ${CrateDataType[this.getType()]}, array: ${this.isArray()}, inline: ${this.isInlined()}, compressed: ${this.isCompressed()}`)
            } else {
                console.log(`ValueRep.getValue(): for .${key} not implemented yet: type: ${CrateDataType[this.getType()]}, array: ${this.isArray()}, inline: ${this.isInlined()}, compressed: ${this.isCompressed()}`)
            }
        }
        return {
            type: CrateDataType[this.getType()!],
            inline: this.isInlined(),
            array: this.isArray(),
            compressed: this.isCompressed(),
            value: v
        }
    }
    // NOTE: tinyusdz has most of it's unpack code in bool CrateReader::UnpackValueRep(const crate::ValueRep &rep, crate::CrateValue *value)
    getValue(crate: CrateFile): any {
        const reader = crate.reader
        switch (this.getType()) {
            case CrateDataType.Bool:
                if (this.isInlined() && !this.isArray() && !this.isCompressed()) {
                    return this.getBool()
                }
                // ValueRep.getValue(): for default not implemented yet: type: Bool, array: true, inline: false, compressed: true
                break
            case CrateDataType.Float:
                if (this.isInlined() && !this.isArray() && !this.isCompressed()) {
                    return this.getFloat()
                }
                break
            case CrateDataType.Double:
                if (this.isInlined() && !this.isArray() && !this.isCompressed()) {
                    return this.getDouble()
                }
                break
            case CrateDataType.Token:
                if (this.isInlined() && !this.isArray() && !this.isCompressed()) {
                    return crate.tokens[this.getIndex()]
                }
                if (!this.isInlined() && this.isArray() && !this.isCompressed()) {
                    crate.reader.offset = this.getIndex()
                    const n = crate.reader.getUint64()
                    const arr = new Array<string>(n)
                    for (let i = 0; i < n; ++i) {
                        arr[i] = crate.tokens[crate.reader.getInt32()]
                    }
                    return arr
                }
                break
            case CrateDataType.String:
                if (this.isInlined() && !this.isArray() && !this.isCompressed()) {
                    return crate.tokens[crate.strings[this.getIndex()]]
                }
                break
            case CrateDataType.Specifier:
                if (!this.isArray() && this.isInlined() && !this.isCompressed()) {
                    return Specifier[this.getIndex()]
                }
                break
            case CrateDataType.Int:
                if (this.isArray() && !this.isInlined() && !this.isCompressed()) {
                    crate.reader.offset = this.getIndex()
                    const n = crate.reader.getUint64()
                    const arr = new Array<number>(n)
                    for (let i = 0; i < n; ++i) {
                        arr[i] = crate.reader.getInt32()
                    }
                    return arr
                }
                if (this.isArray() && !this.isInlined() && this.isCompressed()) {
                    crate.reader.offset = this.getIndex()
                    const n = crate.reader.getUint64()
                    const compSize = crate.reader.getUint64()
                    const comp_buffer = new Uint8Array(crate.reader._dataview.buffer, crate.reader.offset, compSize)
                    const workingSpaceSize = 4 + Math.floor((n * 2 + 7) / 8) + n * 4
                    const workingSpace = new Uint8Array(workingSpaceSize)
                    const decompSz = decompressFromBuffer(comp_buffer, workingSpace)
                    const arr = decodeIntegers(new DataView(workingSpace.buffer), n)
                    return arr
                }
                break
            case CrateDataType.Vec2f:
            case CrateDataType.Vec3f:
            case CrateDataType.Vec4f: {
                let size = 0
                switch (this.getType()) {
                    case CrateDataType.Vec2f:
                        size = 2
                        break
                    case CrateDataType.Vec3f:
                        size = 3
                        break
                    case CrateDataType.Vec4f:
                        size = 4
                        break
                }
                if (this.isArray() && !this.isInlined() && !this.isCompressed()) {
                    crate.reader.offset = this.getIndex()
                    const n = reader.getUint64()
                    const arr = new Array<number>(n * size)
                    for (let i = 0; i < n * size; ++i) {
                        arr[i] = reader.getFloat32()
                    }
                    return arr
                }
                if (!this.isArray() && !this.isInlined() && !this.isCompressed()) {
                    reader.offset = this.getIndex()
                    const arr = new Array<number>(3)
                    for (let i = 0; i < 3; ++i) {
                        arr[i] = reader.getFloat32()
                    }
                    return arr
                }
                if (!this.isArray() && this.isInlined() && !this.isCompressed()) {
                    return this.getVec3f()
                }
            } break
            case CrateDataType.TokenVector:
                if (!this.isInlined() && !this.isArray() && !this.isCompressed()) {
                    crate.reader.offset = this.getIndex()
                    const n = crate.reader.getUint64()
                    const arr = new Array<string>(n)
                    for (let i = 0; i < n; ++i) {
                        const idx = crate.reader.getUint32()
                        arr[i] = crate.tokens[idx]
                    }
                    return arr
                }
                break
            case CrateDataType.AssetPath:
                if (!this.isArray() && this.isInlined() && !this.isCompressed()) {
                    return crate.tokens[this.getIndex()]
                }
                break
            case CrateDataType.Variability:
                if (!this.isArray() && this.isInlined() && !this.isCompressed()) {
                    return Variability[this.getIndex()]
                }
                break
            case CrateDataType.Dictionary:
                if (!this.isArray() && !this.isInlined() && !this.isCompressed()) {
                    reader.offset = this.getIndex()
                    const key = crate.tokens[crate.strings[reader.getUint32()]]
                    const value = new ValueRep(this._buffer, reader.offset)
                    return { [key]: value.toJSON(crate, key) }
                }
                break
            //     const dict = {} as any
            //     reader.offset = this.getIndex()
            //     const n = reader.getUint64()
            //     for (let i = 0; i < n; ++i) {
            //         const key = crate.tokens[crate.strings[reader.getUint32()]]
            //         const offset = reader.getUint64()
            //         // this.reader.offset += offset - 8
            //         // read ValueRep
            //         // UnpackValueRep // NOTE: just reading the ValueRep might be enough if I implement on-demand read
            //         // console.log(`${key} = ? (offset=${offset})`)
            //         dict.key = 0
            //         break
            //     }
            //     return dict
            // } break
            case CrateDataType.TokenListOp:
                if (!this.isArray() && !this.isInlined() && !this.isCompressed()) {
                    reader.offset = this.getIndex()
                    const hdr = new ListOpHeader(reader)
                    const read = () => {
                        const n = reader.getUint64()
                        const arr = new Array<string>(n)
                        for (let i = 0; i < n; ++i) {
                            arr[i] = crate.tokens[reader.getUint32()]
                        }
                        return arr
                    }
                    const list = {} as any
                    if (hdr.isExplicit()) {
                        list.explicit = read()
                    }
                    if (hdr.hasAddedItems()) {
                        list.add = read()
                    }
                    if (hdr.hasPrependedItems()) {
                        list.prepend = read()
                    }
                    if (hdr.hasAppendedItems()) {
                        list.append = read()
                    }
                    if (hdr.hasDeletedItems()) {
                        list.delete = read()
                    }
                    if (hdr.hasOrderedItems()) {
                        list.order = read()
                    }
                    return list
                }
                break
            case CrateDataType.PathListOp:
                if (!this.isArray() && !this.isInlined() && !this.isCompressed()) {
                    reader.offset = this.getIndex()
                    const hdr = new ListOpHeader(reader)
                    const read = () => {
                        const n = reader.getUint64()
                        const arr = new Array<string>(n)
                        for (let i = 0; i < n; ++i) {
                            arr[i] = crate._nodes[reader.getUint32()].getFullPathName()
                        }
                        return arr
                    }
                    const list = {} as any
                    if (hdr.isExplicit()) {
                        list.explicit = read()
                    }
                    if (hdr.hasAddedItems()) {
                        list.add = read()
                    }
                    if (hdr.hasPrependedItems()) {
                        list.prepend = read()
                    }
                    if (hdr.hasAppendedItems()) {
                        list.append = read()
                    }
                    if (hdr.hasDeletedItems()) {
                        list.delete = read()
                    }
                    if (hdr.hasOrderedItems()) {
                        list.order = read()
                    }
                    return list
                }
                break
        }
        return undefined
    }
    getType() { return this._buffer.getUint8(this._offset + 6) as CrateDataType }
    isArray() { return (this._buffer.getUint8(this._offset + 7)! & 128) !== 0 }
    isInlined() { return (this._buffer.getUint8(this._offset + 7)! & 64) !== 0 }
    isCompressed() { return (this._buffer.getUint8(this._offset + 7)! & 32) !== 0 }
    getPayload(): bigint {
        const d = new DataView(this._buffer.buffer)
        return d.getBigUint64(this._offset, true) & 0xffffffffffffn
    }
    // TODO: rename the following to inline? or merge them with the general ones
    getBool(): boolean {
        return this._buffer.getUint8(this._offset) !== 0
    }
    getHalf(): number {
        return this._buffer.getFloat16(this._offset, true)
    }
    getFloat(): number {
        return this._buffer.getFloat32(this._offset, true)
    }
    getDouble(): number {
        return this._buffer.getFloat32(this._offset, true) // FIXME: Float64 from 6 octets???
    }
    // TODO: signed or unsigned?
    getVec3f() {
        return [this._buffer.getUint8(this._offset), this._buffer.getUint8(this._offset + 1), this._buffer.getUint8(this._offset + 2)]
    }
    getIndex(): number {
        if (this._buffer.getUint8(this._offset + 4) || this._buffer.getUint8(this._offset + 5)) {
            throw Error(`getIndex too large`)
        }
        return this._buffer.getUint32(this._offset, true)
    }
    toString(): string {
        return `type: ${GetCrateDataType(this.getType()!)} (${this.getType()}), isArray: ${this.isArray()}, isInlined: ${this.isInlined()}, isCompressed:${this.isCompressed()}, payload: ${this.getPayload()}`
    }
}

function GetCrateDataType(type_id: number) {
    return CrateDataType[type_id]
}