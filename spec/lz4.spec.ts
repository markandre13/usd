// https://lz4.org
// block format
// frame format

import { expect } from "chai"
import { compressBlock, compressBound, decompressBlock } from "../src/crate/lz4.ts"
import { hexdump, parseHexDump } from "../src/detail/hexdump.ts"

describe("lz4", () => {
    it("0 bytes", () => {
        const uncompressed = parseHexDump(`
            0000                                                                
        `)

        const dst = new Uint8Array(compressBound(uncompressed.length))
        const n = compressBlock(uncompressed, dst, 0, uncompressed.length)
        const compressed = new Uint8Array(dst.buffer, 0, n)

        // hexdump(compressed)
        expect(compressed).to.deep.equal(parseHexDump(`
            0000 00                                              
        `))
    })
    it("1 byte", () => {
        const uncompressed = parseHexDump(`
            0000 41                                              A               
        `)

        const dst = new Uint8Array(compressBound(uncompressed.length))
        const n = compressBlock(uncompressed, dst, 0, uncompressed.length)
        const compressed = new Uint8Array(dst.buffer, 0, n)

        // hexdump(compressed)
        expect(compressed).to.deep.equal(parseHexDump(`
            0000 10 41                                           .A
        `))
    })
    it("18 bytes, uncompressable", () => {
        const uncompressed = parseHexDump(`
            0000 4d 65 73 68 43 79 6c 69 6e 64 65 72 53 70 68 65 MeshCylinderSphe
            0010 72 65                                           re
        `)

        const dst = new Uint8Array(compressBound(uncompressed.length))
        const n = compressBlock(uncompressed, dst, 0, uncompressed.length)
        const compressed = new Uint8Array(dst.buffer, 0, n)

        // hexdump(compressed)
        expect(compressed).to.deep.equal(parseHexDump(`
            0000 f0 03 4d 65 73 68 43 79 6c 69 6e 64 65 72 53 70 ..MeshCylinderSp
            0010 68 65 72 65                                     here
        `))
    })
    it("32 bytes, compressable", () => {

        const uncompressed = parseHexDump(`
            0000 41 41 41 41 41 41 41 41 41 41 41 41 41 41 41 41 AAAAAAAAAAAAAAA
            0010 41 41 41 41 41 41 41 41 41 41 41 41 41 41 41 41 AAAAAAAAAAAAAAA
        `)

        const dst = new Uint8Array(compressBound(uncompressed.length))
        const n = compressBlock(uncompressed, dst, 0, uncompressed.length)
        const compressed = new Uint8Array(dst.buffer, 0, n)

        // hexdump(compressed)
        expect(compressed).to.deep.equal(parseHexDump(`
            0000 1f 41 01 00 07 50 41 41 41 41 41                .A...PAAAAA
        `))

        const check = new Uint8Array(uncompressed.length)
        const m = decompressBlock(compressed, check, 0, compressed.length, 0)
        const checkSliced = new Uint8Array(check.buffer, 0, m)
        expect(checkSliced).to.deep.equal(uncompressed)
    })
    it("LZ4_MIN_LENGTH bytes, compressable", () => {
        const uncompressed = parseHexDump(`
            0000 41 41 41 41 41 41 41 41 41 41 41 41 41          AAAAAAAAAAAA
        `)

        const dst = new Uint8Array(compressBound(uncompressed.length))
        const n = compressBlock(uncompressed, dst, 0, uncompressed.length)
        const compressed = new Uint8Array(dst.buffer, 0, n)

        // hexdump(compressed)
        expect(compressed).to.deep.equal(parseHexDump(`
            0000 13 41 01 00 50 41 41 41 41 41                   .A..PAAAAA
        `))

        const check = new Uint8Array(uncompressed.length)
        const m = decompressBlock(compressed, check, 0, compressed.length, 0)
        const checkSliced = new Uint8Array(check.buffer, 0, m)
        expect(checkSliced).to.deep.equal(uncompressed)
    })
    it("LZ4_MIN_LENGTH bytes, uncompressable", () => {
        const uncompressed = parseHexDump(`
            0000 41 42 43 44 45 46 47 48 49 4a 4b 4c 4d          ABCDEFGHIJKLM   
        `)

        const dst = new Uint8Array(compressBound(uncompressed.length))
        const n = compressBlock(uncompressed, dst, 0, uncompressed.length)
        const compressed = new Uint8Array(dst.buffer, 0, n)

        // hexdump(compressed)
        expect(compressed).to.deep.equal(parseHexDump(`
            0000 d0 41 42 43 44 45 46 47 48 49 4a 4b 4c 4d       .ABCDEFGHIJKLM
        `))
    })
    it("decompressBlock() fails on output from lz4js' compressBlock()", () => {
        const compressed = parseHexDump(`
            0000 f8 62 3b 2d 29 00 64 6f 63 75 6d 65 6e 74 61 74 .b;-).documentat
            0010 69 6f 6e 00 42 6c 65 6e 64 65 72 20 76 35 2e 30 ion.Blender v5.0
            0020 2e 30 00 6d 65 74 65 72 73 50 65 72 55 6e 69 74 .0.metersPerUnit
            0030 00 75 70 41 78 69 73 00 5a 00 73 70 65 63 69 66 .upAxis.Z.specif
            0040 69 65 72 00 74 79 70 65 4e 61 6d 65 00 58 66 6f ier.typeName.Xfo
            0050 72 6d 00 4d 65 73 68 00 70 72 6f 70 65 72 74 69 rm.Mesh.properti
            0060 65 73 00 66 61 63 65 56 65 72 74 65 78 49 6e 64 es.faceVertexInd
            0070 69 63 65 12 00 f1 0c 43 6f 75 6e 74 73 00 69 6e ice....Counts.in
            0080 74 5b 5d 00 64 65 66 61 75 6c 74 00 2f 00 43 75 t[].default./.Cu
            0090 62 65 05 00 50 5f 30 30 31 00                   be..P_001.      
        `)
        const uncompressed = new Uint8Array(162)
        const n = decompressBlock(compressed, uncompressed, 0, compressed.byteLength, 0)
        expect(n).to.equal(-120)
    })

    it("compressBlock() is accepted by our more strict decompressBlock()", () => {
        const uncompressed = parseHexDump(`
            0000 3b 2d 29 00 64 6f 63 75 6d 65 6e 74 61 74 69 6f ;-).documentatio
            0010 6e 00 42 6c 65 6e 64 65 72 20 76 35 2e 30 2e 30 n.Blender v5.0.0
            0020 00 6d 65 74 65 72 73 50 65 72 55 6e 69 74 00 75 .metersPerUnit.u
            0030 70 41 78 69 73 00 5a 00 73 70 65 63 69 66 69 65 pAxis.Z.specifie
            0040 72 00 74 79 70 65 4e 61 6d 65 00 58 66 6f 72 6d r.typeName.Xform
            0050 00 4d 65 73 68 00 70 72 6f 70 65 72 74 69 65 73 .Mesh.properties
            0060 00 66 61 63 65 56 65 72 74 65 78 49 6e 64 69 63 .faceVertexIndic
            0070 65 73 00 66 61 63 65 56 65 72 74 65 78 43 6f 75 es.faceVertexCou
            0080 6e 74 73 00 69 6e 74 5b 5d 00 64 65 66 61 75 6c nts.int[].defaul
            0090 74 00 2f 00 43 75 62 65 00 43 75 62 65 5f 30 30 t./.Cube.Cube_00
            00a0 31 00                                           1.
        `)

        for (let length = 0; length <= uncompressed.length; ++length) {
            const uncompressedSliced = new Uint8Array(uncompressed.buffer, 0, length)
            // hexdump(uncompressedSliced)

            const dst = new Uint8Array(compressBound(uncompressed.length))
            const n = compressBlock(uncompressedSliced, dst, 0, uncompressedSliced.length)
            const compressed = new Uint8Array(dst.buffer, 0, n)

            const check = new Uint8Array(length)
            const m = decompressBlock(compressed, check, 0, n, 0)
            const checkSliced = new Uint8Array(check.buffer, 0, m)
            // hexdump(checkSliced)

            expect(checkSliced).to.deep.equal(uncompressedSliced)
        }
    })
})
