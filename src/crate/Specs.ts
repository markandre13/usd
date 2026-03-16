import type { Reader } from "./Reader"
import type { SpecType } from "./SpecType"
import type { Writer } from "./Writer"

export class Specs {
    pathIndexes: number[]
    fieldsetIndexes: number[]
    specTypeIndexes: SpecType[]

    constructor(reader?: Reader) {
        if (reader !== undefined) {
            const num_specs = reader.getUint64()

            // console.log(`Specs(reader): num_specs = ${num_specs}`)

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
