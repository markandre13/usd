import type { Reader } from "./Reader"
import { Section } from "./Section"
import { SectionName } from "./SectionName"
import { Writer } from "./Writer"

export class FieldSets {
    fieldset_indices: number[]
    constructor(reader?: Reader) {
        if (reader) {
        this.fieldset_indices = reader.getCompressedIntegers()
        // console.log(`${SectionName.FIELDSETS} ${this.fieldset_indices.length} = ${JSON.stringify(this.fieldset_indices)}`)
        } else {
            this.fieldset_indices = []
        }
    }

    serialize(writer: Writer) {
        writer.writeCompressedIntegers(this.fieldset_indices)
    }
}
