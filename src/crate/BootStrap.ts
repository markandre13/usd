import type { Reader } from "./Reader.ts"

export class BootStrap {
    indent: string
    version: {
        major: number
        minor: number
        patch: number
    }
    tocOffset: number
    constructor(reader: Reader) {
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

        // console.log(`VERSION %o`, this.version)
    }
}
