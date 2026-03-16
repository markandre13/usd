import { Section } from "./Section"
import type { Reader } from "./Reader"
import type { Writer } from "./Writer"
import type { SectionName } from "./SectionName"

export class TableOfContents {
    sections = new Map<string, Section>()
    reader?: Reader
    constructor(reader?: Reader) {
        if (reader) {
            this.reader = reader
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
    seek(name: SectionName) {
        const section = this.sections.get(name)
        if (section === undefined) {
            throw Error(`missing section ${name}`)
        }
        this.reader!.offset = section.start
    }
    serialize(writer: Writer): void {
        writer.writeUint64(this.sections.size)
        for (const [name, section] of this.sections) {
            section.serialize(writer)
        }
    }
}
