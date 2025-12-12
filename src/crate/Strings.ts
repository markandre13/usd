import type { Reader } from "./Reader.ts"
import { SectionName } from "./SectionName.ts"
import type { TableOfContents } from "./TableOfContents.ts"

export class Strings {
    strings: number[]
    constructor(reader: Reader, toc: TableOfContents) {
        const section = toc.sections.get(SectionName.STRINGS)
        if (section === undefined) {
            throw Error(`No STRINGS sections`)
        }
        reader.offset = section.start
        const n = reader.getUint64()
        this.strings = new Array(n)
        for (let i = 0; i < n; ++i) {
            this.strings[i] = reader.getUint32()
        }
        if (section.start + section.size !== reader.offset) {
            throw Error(`STRINGS: not at end: expected end at ${section.start + section.size} but reader is at ${reader.offset}`)
        }
    }
}
