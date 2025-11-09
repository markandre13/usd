import { decompress, decompressBlock, decompressFrame } from "lz4js"
import { hexdump, parseHexDump } from "../hexdump.ts"
import { expect } from "chai"
import { CrateFile, decompressFromBuffer, Reader } from "../index.js"
import { readFileSync } from "fs"

// readfields -> readcompressedint -> de

describe("USD", function () {
    it("all", function() {
            const buffer = readFileSync("cube.usdc")
            const data = new DataView(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
            const reader = new Reader(data)
        
            const crate = new CrateFile(reader)
    })

    xit("decompressFromBuffer(src, dst)", function () {
        const src = parseHexDump(`
            0000 00 52 2d 00 00 00 55 01 00 f0 18 44 11 45 15 45 .R-...U....D.E.E
            0010 45 54 54 04 02 01 02 02 02 01 01 02 fa 0c f4 04 ETT.............
            0020 0b 02 fb f8 fc 04 fc 0c f8 08 f8 08 f8 2c 01 d3 .............,..
            0030 d3 00 03 00 f0 02 00 00 00 d3 09 ca 0b 02 c6 d3 ................
            0040 00 11 c2 00 00 d3 d3                            .......         `)

        const e = parseHexDump(`
            0000 2d 00 00 00 55 55 55 55 55 55 55 44 11 45 15 45 -...UUUUUUUD.E.E
            0010 45 54 54 04 02 01 02 02 02 01 01 02 fa 0c f4 04 ETT.............
            0020 0b 02 fb f8 fc 04 fc 0c f8 08 f8 08 f8 2c 01 d3 .............,..
            0030 d3 00 d3 d3 00 d3 00 00 00 d3 09 ca 0b 02 c6 d3 ................
            0040 00 11 c2 00 00 d3 d3                                            `)

        const dst = new Uint8Array(e.length)
        const n = decompressFromBuffer(src, dst)
        expect(n).to.equal(e.length)
        expect(dst).to.deep.equal(e)
    })
})

