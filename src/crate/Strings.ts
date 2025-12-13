import { Reader } from "./Reader.js"
import type { Tokens } from "./Tokens.ts"
import type { Writer } from "./Writer.ts"

export class Strings {
    private strings: number[]
    private tokens: Tokens
    _strings?: Map<string, number>

    constructor(tokens: Tokens)
    constructor(reader: Reader, tokens: Tokens)
    constructor(readerOrTokens: Reader | Tokens, tokens?: Tokens) {
        if (readerOrTokens instanceof Reader) {
            this.tokens = tokens!
            const n = readerOrTokens.getUint64()
            this.strings = new Array(n)
            for (let i = 0; i < n; ++i) {
                this.strings[i] = readerOrTokens.getUint32()
            }
            // if (section.start + section.size !== reader.offset) {
            //     throw Error(`STRINGS: not at end: expected end at ${section.start + section.size} but reader is at ${reader.offset}`)
            // }
        } else {
            this.tokens = readerOrTokens
            this.strings = []
        }
    }
    serialize(writer: Writer) {
        writer.writeUint64(this.strings.length)
        for(const index of this.strings) {
            writer.writeUint32(index)
        }
    }
    get(index: number) {
        if (index >= this.strings.length) {
            throw Error(`string index ${index} is out of range`)
        }
        return this.tokens.get(this.strings[index])
    }
    add(value: string): number {
        if (this._strings === undefined) {
            this._strings = new Map()
        }
        let index = this._strings.get(value)
        if (index === undefined) {
            index = this.strings.length
            const token = this.tokens.add(value)
            this.strings.push(token)
        }
        return index
    }
}
