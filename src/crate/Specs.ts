import type { Reader } from "./Reader.ts"
import { SectionName } from "./SectionName.ts"
import type { SpecType } from "./SpecType.ts"
import type { TableOfContents } from "./TableOfContents.ts"

export class Specs {
    pathIndexes: number[]
    fieldsetIndexes: number[]
    specTypeIndexes: SpecType[]

    constructor(reader: Reader, toc: TableOfContents) {
        const section = toc.sections.get(SectionName.SPECS)
        if (section === undefined) {
            throw Error('No SPECS')
        }
        reader.offset = section.start

        const num_specs = reader.getUint64()

        this.pathIndexes = reader.getCompressedIntegers(num_specs)
        this.fieldsetIndexes = reader.getCompressedIntegers(num_specs)
        this.specTypeIndexes = reader.getCompressedIntegers(num_specs)
    }
}
