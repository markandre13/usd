import type { Reader } from "./Reader.ts"

export class FieldSets {
    fieldset_indices: number[]
    constructor(reader: Reader) {
        this.fieldset_indices = reader.getCompressedIntegers()
    }
}
