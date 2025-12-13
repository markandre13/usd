import type { Reader } from "./Reader.ts"

export class Strings {
    strings: number[]
    constructor(reader: Reader) {
        const n = reader.getUint64()
        this.strings = new Array(n)
        for (let i = 0; i < n; ++i) {
            this.strings[i] = reader.getUint32()
        }
        // if (section.start + section.size !== reader.offset) {
        //     throw Error(`STRINGS: not at end: expected end at ${section.start + section.size} but reader is at ${reader.offset}`)
        // }
    }
}
