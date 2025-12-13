import type { Reader } from "./Reader.ts"
import type { SpecType } from "./SpecType.ts"

export class Specs {
    pathIndexes: number[]
    fieldsetIndexes: number[]
    specTypeIndexes: SpecType[]

    constructor(reader: Reader) {
        const num_specs = reader.getUint64()
        this.pathIndexes = reader.getCompressedIntegers(num_specs)
        this.fieldsetIndexes = reader.getCompressedIntegers(num_specs)
        this.specTypeIndexes = reader.getCompressedIntegers(num_specs)
    }
}
