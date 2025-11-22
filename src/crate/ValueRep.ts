// 8 octets
// Value in file representation.  Consists of a 2 bytes of type information
// (type enum value, array bit, and inlined-value bit) and 6 bytes of data.
// If possible, we attempt to store certain values directly in the local
// data, such as ints, floats, enums, and special-case values of other types
// (zero vectors, identity matrices, etc).  For values that aren't stored
// inline, the 6 data bytes are the offset from the start of the file to the

import { CrateDataType } from "./CrateDataType.ts"

// value's location.
// FIXME: last two bytes are type info
export class ValueRep {
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
    getPayload(): bigint {
        const d = new DataView(this._buffer.buffer)
        return d.getBigUint64(this._offset, true) & 0xffffffffffffn
    }
    getBool(): boolean {
        return this._buffer.at(this._offset) !== 0
    }
    getHalf(): number {
        const d = new DataView(this._buffer.buffer)
        return d.getFloat16(this._offset, true)
    }
    getFloat(): number {
        const d = new DataView(this._buffer.buffer)
        return d.getFloat32(this._offset, true)
    }
    getDouble(): number {
        const d = new DataView(this._buffer.buffer)
        return d.getFloat32(this._offset, true) // FIXME: Float64 from 6 octets???
    }
    // TODO: signed or unsigned?
    getVec3f() {
        const d = new DataView(this._buffer.buffer)
        return [d.getUint8(this._offset), d.getUint8(this._offset+1), d.getUint8(this._offset+2)]
    }
    getIndex(): number {
        // return new Number(this.getPayload()).valueOf()
        const d = new DataView(this._buffer.buffer)
        if (this._buffer.at(this._offset + 4) || this._buffer.at(this._offset + 5)) {
            throw Error(`getIndex too large`)
        }
        return d.getUint32(this._offset, true)
    }
    toString(): string {
        return `ty: ${GetCrateDataType(this.getType()!)} ${this.getType()}(xxx), isArray: ${this.isArray()}, isInlined: ${this.isInlined()}, isCompressed:${this.isCompressed()}, payload: ${this.getPayload()}`
    }
}

function GetCrateDataType(type_id: number) {
    return CrateDataType[type_id]
}