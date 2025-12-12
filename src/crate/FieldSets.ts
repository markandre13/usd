import type { Reader } from "./Reader.ts"
import { SectionName } from "./SectionName.ts"
import type { TableOfContents } from "./TableOfContents.ts"

export class FieldSets {
    fieldset_indices: number[]
    constructor(reader: Reader, toc: TableOfContents) {
        const section = toc.sections.get(SectionName.FIELDSETS)
        if (section === undefined) {
            throw Error(`No FIELDSETS sections`)
        }
        reader.offset = section.start
        this.fieldset_indices = reader.getCompressedIntegers()
    }
}
