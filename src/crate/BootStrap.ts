import { Reader } from "./Reader.js"
import type { Writer } from "./Writer.ts"

export class BootStrap {
    indent: string
    version: {
        major: number
        minor: number
        patch: number
    }
    tocOffset: number
    private reader?: Reader

    constructor(reader?: Reader) {
        if (reader !== undefined) {
            this.reader = reader
            this.indent = reader.getString(8)
            if (this.indent !== "PXR-USDC") {
                throw Error("Not a Pixar Universal Screen Description Crate (USDC) file")
            }
            this.version = {
                major: reader.getUint8(),
                minor: reader.getUint8(),
                patch: reader.getUint8()
            }
            reader.offset += 5
            this.tocOffset = reader.getUint64()
            // console.log(`tocOffset: ${this.tocOffset}`)
            // console.log(`VERSION %o`, this.version)
        } else {
            this.indent = "PXR-USDC"
            this.version = {
                major: 0,
                minor: 8,
                patch: 0
            }
            this.tocOffset = 8 + 3 + 5 + 8
        }
    }
    skip(writer: Writer) {
        writer.skip(24)
    }
    serialize(writer: Writer) {
        writer.writeString(this.indent)
        writer.writeUint8(this.version.major)
        writer.writeUint8(this.version.minor)
        writer.writeUint8(this.version.patch)
        writer.writeString("\0\0\0\0\0")
        writer.writeUint64(this.tocOffset)
    }

    seekTOC() {
        this.reader!.offset = this.tocOffset
    }

}
