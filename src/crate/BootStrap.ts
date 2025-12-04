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

    constructor(io: Reader | Writer) {
        if (io instanceof Reader) {
            this.indent = io.getString(8)
            if (this.indent !== "PXR-USDC") {
                throw Error("Not a Pixar Universal Screen Description Crate (USDC) file")
            }
            this.version = {
                major: io.getUint8(),
                minor: io.getUint8(),
                patch: io.getUint8()
            }
            io.offset += 5
            this.tocOffset = io.getUint64()
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
            io.writeString(this.indent)
            io.writeUint8(this.version.major)
            io.writeUint8(this.version.minor)
            io.writeUint8(this.version.patch)
            io.writeString("\0\0\0\0\0")
            io.writeUint64(this.tocOffset)
        }
    }
}
