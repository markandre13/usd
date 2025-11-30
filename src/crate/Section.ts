import { Reader } from "./Reader.js"
import type { Writer } from "./Writer.ts"

interface SectionData {
    name: string
    start: number
    size: number
}

export class Section implements SectionData {
    name: string
    start: number
    size: number

    constructor(reader: Reader | SectionData) {
        if (reader instanceof Reader) {
            this.name = reader.getString(16)
            this.start = reader.getUint64()
            this.size = reader.getUint64()
        } else {
            this.name = reader.name
            this.start = reader.start
            this.size = reader.size
        }
    }
    serialize(writer: Writer) {
        writer.writeString(this.name, 16)
        writer.writeUint64(this.start)
        writer.writeUint64(this.size)
    }
}
