import { decodeIntegers, decompressFromBuffer } from "../index.ts"

export const _SectionNameMaxLength = 15

export class Reader {
    _dataview: DataView

    offset = 0;
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
    getUint16() {
        const value = this._dataview.getUint16(this.offset, true)
        this.offset += 2
        return value
    }
    getUint32() {
        const value = this._dataview.getUint32(this.offset, true)
        this.offset += 4
        return value
    }
    getInt32() {
        const value = this._dataview.getInt32(this.offset, true)
        this.offset += 4
        return value
    }
    getUint64() {
        const value = new Number(this._dataview.getBigUint64(this.offset, true)).valueOf()
        this.offset += 8
        return value
    }
    getFloat16() {
        const value = this._dataview.getFloat16(this.offset, true)
        this.offset += 2
        return value
    }
    getFloat32() {
        const value = this._dataview.getFloat32(this.offset, true)
        this.offset += 4
        return value
    }
    getFloat64() {
        const value = this._dataview.getFloat64(this.offset, true)
        this.offset += 8
        return value
    }
    getCompressedIntegers(numberOfInts?: number) {
        if (numberOfInts === undefined) {
            numberOfInts = this.getUint64()
        }

        const compressedSize = this.getUint64()
        const compressed = new Uint8Array(this._dataview.buffer, this.offset, compressedSize)
        this.offset += compressedSize

        const workingSpaceSize = 4                   // common value uint32
            + Math.floor((numberOfInts * 2 + 7) / 8) // number of code bytes
            + numberOfInts * 4                       // max. space for uint32
        const workingSpace = new Uint8Array(workingSpaceSize)

        const decompSz = decompressFromBuffer(compressed, workingSpace)
        const result = decodeIntegers(new DataView(workingSpace.buffer), numberOfInts)
        return result
    }
}
