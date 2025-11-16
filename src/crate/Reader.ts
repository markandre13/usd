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
