import type { Reader } from "./Reader.ts"
import type { Tokens } from "./Tokens.ts"

export class Strings {
    private strings: number[]
    private tokens: Tokens
    constructor(reader: Reader, tokens: Tokens) {
        this.tokens = tokens
        const n = reader.getUint64()
        this.strings = new Array(n)
        for (let i = 0; i < n; ++i) {
            this.strings[i] = reader.getUint32()
        }
        // if (section.start + section.size !== reader.offset) {
        //     throw Error(`STRINGS: not at end: expected end at ${section.start + section.size} but reader is at ${reader.offset}`)
        // }
    }
    get(index: number) {
        if (index >= this.strings.length) {
            throw Error(`string index ${index} is out of range`)
        }
        return this.tokens.get(this.strings[index])
    }
    // add(value: string): number {
    // }
}
