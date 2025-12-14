import type { Reader } from "./Reader.ts"
import type { SpecType } from "./SpecType.ts"
import type { Writer } from "./Writer.ts"

export class Specs {
    pathIndexes: number[]
    fieldsetIndexes: number[]
    specTypeIndexes: SpecType[]

    constructor(reader?: Reader) {
        if (reader !== undefined) {
            const num_specs = reader.getUint64()
            this.pathIndexes = reader.getCompressedIntegers(num_specs)
            this.fieldsetIndexes = reader.getCompressedIntegers(num_specs)
            this.specTypeIndexes = reader.getCompressedIntegers(num_specs)
        } else {
            this.pathIndexes = []
            this.fieldsetIndexes = []
            this.specTypeIndexes = []
        }
    }
    serialize(writer: Writer) {
        if (this.pathIndexes.length !== this.fieldsetIndexes.length &&
            this.pathIndexes.length !== this.specTypeIndexes.length) {
            throw Error(`all Specs arrays must be of the same size`)
        }
        writer.writeUint64(this.pathIndexes.length)
        writer.writeCompressedIntWithoutSize(this.pathIndexes)
        writer.writeCompressedIntWithoutSize(this.fieldsetIndexes)
        writer.writeCompressedIntWithoutSize(this.specTypeIndexes)
    }
}
