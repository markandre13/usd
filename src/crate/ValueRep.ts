// 8 octets
// Value in file representation.  Consists of a 2 bytes of type information
// (type enum value, array bit, and inlined-value bit) and 6 bytes of data.
// If possible, we attempt to store certain values directly in the local
// data, such as ints, floats, enums, and special-case values of other types
// (zero vectors, identity matrices, etc).  For values that aren't stored
// inline, the 6 data bytes are the offset from the start of the file to the
// value's location.
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
    getPayload() {
        const d = new DataView(this._buffer.buffer)
        return d.getBigUint64(this._offset, true) & 0xffffffffffffn
    }
    toString() {
        return `ty: ${this.getType()}(xxx), isArray: ${this.isArray()}, isInlined: ${this.isInlined()}, isCompressed:${this.isCompressed()}, payload: ${this.getPayload()}`
    }
}
