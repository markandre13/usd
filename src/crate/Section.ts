import type { Reader } from "./Reader.ts"

export class Section {
    name: string
    start: number
    size: number

    constructor(reader: Reader) {
        this.name = reader.getString(16)
        this.start = reader.getUint64()
        this.size = reader.getUint64()
    }
}
