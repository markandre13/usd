import { Section } from "./Section.ts"
import type { Reader } from "./Reader.ts"
import type { Writer } from "./Writer.ts"

export class TableOfContents {
    sections = new Map<string, Section>();
    constructor(reader?: Reader) {
        if (reader) {
            const n = reader.getUint64()
            for (let i = 0; i < n; ++i) {
                const section = new Section(reader)
                this.sections.set(section.name, section)
            }
        }
    }
    addSection(section: Section) {
        this.sections.set(section.name, section)
    }
    serialize(writer: Writer): void {
        writer.writeUint64(this.sections.size)
        for(const [name, section] of this.sections) {
            section.serialize(writer)
        }
    }
}
