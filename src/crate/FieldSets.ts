import type { Reader } from "./Reader"
import { Writer } from "./Writer"

export class FieldSets {
    fieldset_indices: number[]
    constructor(reader?: Reader) {
        if (reader) {
        this.fieldset_indices = reader.getCompressedIntegers()
        } else {
            this.fieldset_indices = []
        }
    }

    serialize(writer: Writer) {
        writer.writeCompressedIntegers(this.fieldset_indices)
    }
}
