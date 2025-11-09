import { hexdump, parseHexDump } from "../hexdump.ts"
import { expect } from "chai"
import { CrateFile, decodeIntegers, decompressFromBuffer, readCompressedInts, Reader } from "../index.js"
import { readFileSync } from "fs"

// https://github.com/lighttransport/tinyusdz
// mkdir build
// cd build
// cmake ..
// make -j12
// ./tusdcat /Users/mark/js/usd/cube.usdc

// readfields -> readcompressedint -> de

describe("USD", function () {
    it("all", function () {
        const buffer = readFileSync("cube.usdc")
        const data = new DataView(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
        const reader = new Reader(data)

        const crate = new CrateFile(reader)
    })

    it("decompressFromBuffer(src, dst)", function () {
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

    it("decodeIntegers()", function () {
        const src = parseHexDump(`
            0000 2d 00 00 00 55 55 55 55 55 55 55 44 11 45 15 45 -...UUUUUUUD.E.E
            0010 45 54 54 04 02 01 02 02 02 01 01 02 fa 0c f4 04 ETT.............
            0020 0b 02 fb f8 fc 04 fc 0c f8 08 f8 08 f8 2c 01 d3 .............,..
            0030 d3 00 d3 d3 00 d3 00 00 00 d3 09 ca 0b 02 c6 d3 ................
            0040 00 11 c2 00 00 d3 d3         `)

        const result = decodeIntegers(new DataView(src.buffer), 63)

        const want = [2, 3, 5, 7, 9, 10, 11, 13, 7, 19, 7, 11, 22, 24, 19, 11,
            7, 11, 7, 19, 11, 19, 11, 19, 11, 55, 56, 11, 56, 11, 56, 56,
            11, 56, 11, 56, 56, 11, 56, 56, 56, 56, 11, 56, 65, 11, 56, 67,
            69, 11, 56, 11, 56, 56, 73, 11, 56, 56, 56, 11, 56, 11, 56,]

        expect(result).to.deep.equal(want)
    })

    it("readCompressedInts()", function () {
        const compressed = parseHexDump(`
            0000 47 00 00 00 00 00 00 00 00 52 2d 00 00 00 55 01 G........R-...U.
            0010 00 f0 18 44 11 45 15 45 45 54 54 04 02 01 02 02 ...D.E.EETT.....
            0020 02 01 01 02 fa 0c f4 04 0b 02 fb f8 fc 04 fc 0c ................
            0030 f8 08 f8 08 f8 2c 01 d3 d3 00 03 00 f0 02 00 00 .....,..........
            0040 00 d3 09 ca 0b 02 c6 d3 00 11 c2 00 00 d3 d3    ...............
            `)
        const reader = new Reader(new DataView(compressed.buffer))
        const result = readCompressedInts(reader, 63)
        const want = [2, 3, 5, 7, 9, 10, 11, 13, 7, 19, 7, 11, 22, 24, 19, 11,
            7, 11, 7, 19, 11, 19, 11, 19, 11, 55, 56, 11, 56, 11, 56, 56,
            11, 56, 11, 56, 56, 11, 56, 56, 56, 56, 11, 56, 65, 11, 56, 67,
            69, 11, 56, 11, 56, 56, 73, 11, 56, 56, 56, 11, 56, 11, 56,]

        expect(result).to.deep.equal(want)
        expect(reader.offset).to.equal(compressed.byteLength)
    })
})

