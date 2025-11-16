import { Section } from "./Section.ts"
import type { Reader } from "./Reader.ts"

export class TableOfContents {
    sections = new Map<string, Section>();
    constructor(reader: Reader) {
        const n = reader.getUint64()
        for (let i = 0; i < n; ++i) {
            const section = new Section(reader)
            this.sections.set(section.name, section)
        }
    }
}
