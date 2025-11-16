import { hexdump, parseHexDump } from "../src/detail/hexdump.ts"
import { expect } from "chai"
import { decodeIntegers, decompressFromBuffer, readCompressedInts, type BuildDecompressedPathsArg } from "../src/index.ts"
import { Path } from "../src/path/Path.ts"
import { readFileSync } from "fs"
import { Reader } from "../src/crate/Reader.ts"
import { CrateFile } from "../src/crate/CrateFile.ts"

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

        const want = [
            2, 3, 5, 7, 9, 10, 11, 13, 7, 19, 7, 11, 22, 24, 19, 11,
            7, 11, 7, 19, 11, 19, 11, 19, 11, 55, 56, 11, 56, 11, 56, 56,
            11, 56, 11, 56, 56, 11, 56, 56, 56, 56, 11, 56, 65, 11, 56, 67,
            69, 11, 56, 11, 56, 56, 73, 11, 56, 56, 56, 11, 56, 11, 56]

        expect(result).to.deep.equal(want)
    })

    it("decodeIntegers() with overflow in prevVal", function () {
        const src = parseHexDump(`
            0000 fd ff ff ff 55 55 55 40 55 55 44 54 15 01 07 08 ....UUU@UUDT....
            0010 dc 29 ca 03 04 ff fb 03 04 33 13 b6 04 47 b3 f9 .).......3...G..
            0020 ff 07 02 02 08 38 bb 01 fe ff                   .....8....     
        `)

        const result = decodeIntegers(new DataView(src.buffer), 35)

        const want = [
            1, 8, 16, -20, 21, -33, -30, -26, -27, -32, -29, -25, -28, -31, -34, 17,
            36, -38, -34, 37, -40, -47, -48, -41, -44, -42, -45, -43, -46, -38, 18, -51,
            -50, -52, -53,]

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

    /**
     * Path in tinyusdz, SdfPath in OpenUSD
     * couldn't find any documentation/spec yet, so based on tinyusdz
     * which might be incomplete but was easier to read
     */
    describe("Path", function () {
        describe("constructor", function () {
            it("prop must not contain slashes", function () {
                const path = new Path("", "a/b")
                expect(path.isValid()).to.be.false
            })
            it("prop must not start with '.'", function () {
                const path = new Path("", ".a")
                expect(path.isValid()).to.be.false
            })
            it("/.", function () {
                const path = new Path("/.", "")
                expect(path.isValid()).to.be.false
            })
            // i think this is needed but not covered by tiyusdz?
            xit("./", function () {
                const path = new Path("./", "")
                expect(path.isValid()).to.be.false
            })
            describe("absolute path /...", function () {
                it("x0", function () {
                    const path = new Path("/", "a")
                    expect(path.isValid()).to.be.true
                    expect(path.prim_part()).to.equal("/")
                    expect(path.prop_part()).to.equal("a")
                    expect(path._element).to.equal("a")
                })
                it("x2", function () {
                    const path = new Path("/a/b", "")
                    expect(path.isValid()).to.be.true
                    expect(path.prim_part()).to.equal("/a/b")
                    expect(path._element).to.equal("b")
                })
                it("x3", function () {
                    const path = new Path("/a", "")
                    expect(path.isValid()).to.be.true
                    expect(path.prim_part()).to.equal("/a")
                    expect(path._element).to.equal("a")
                })
                it("when prim_part contains property name, prop must be empty", function () {
                    const path = new Path("/a.b", "x")
                    expect(path.isValid()).to.be.false
                })
                it("prim contains property name, it's split into primt and prop part", function () {
                    const path = new Path("/a.b", "")
                    expect(path.prim_part()).to.equal("/a")
                    expect(path.prop_part()).to.equal("b")
                    expect(path._element).to.equal("b")
                    expect(path.isValid()).to.be.true
                })
                it("absolute path must not contain more than one property name", function () {
                    const path = new Path("/a.b.c", "")
                    expect(path.isValid()).to.be.false
                })
            })
            describe("relative path", function () {
                it("relative path", function () {
                    const path = new Path("./xform", "b")
                    expect(path.prim_part()).to.equal("./xform")
                    expect(path.prop_part()).to.equal("b")
                    expect(path._element).to.equal("b")
                    expect(path.isValid()).to.be.true
                })
                it("relative path with prop", function () {
                    const path = new Path("./xform", "b")
                    expect(path.prim_part()).to.equal("./xform")
                    expect(path.prop_part()).to.equal("b")
                    expect(path._element).to.equal("b")
                    expect(path.isValid()).to.be.true
                })
                it("relative path without prop", function () {
                    const path = new Path("./xform", "")
                    expect(path.prim_part()).to.equal("./xform")
                    expect(path._element).to.equal("xform")
                    expect(path.isValid()).to.be.true
                })
            })
            describe("neiter absolute nor relative path", function () {
                it("relative prim", function () {
                    const path = new Path("prim", "a")
                    expect(path.prim_part()).to.equal("prim")
                    expect(path.prop_part()).to.equal("a")
                    expect(path.isValid()).to.be.true
                })
                it("relative prim", function () {
                    const path = new Path("prim", "a")
                    expect(path.prim_part()).to.equal("prim")
                    expect(path.prop_part()).to.equal("a")
                    expect(path.isValid()).to.be.true
                })
                it("relative prim with prop", function () {
                    const path = new Path("prim.prop", "a")
                    expect(path.prim_part()).to.equal("prim")
                    expect(path.prop_part()).to.equal("prop")
                    expect(path.isValid()).to.be.true
                })
                it("prop must not contain '/", function () {
                    const path = new Path("prim.prop/pop", "a")
                    // expect(path.prim_part()).to.equal("prim")
                    // expect(path.prop_part()).to.equal("prop")
                    expect(path.isValid()).to.be.false
                })
                it("xxx", function () {
                    const path = new Path("prim.prop/pop.top", "a")
                    // expect(path.prim_part()).to.equal("prim")
                    // expect(path.prop_part()).to.equal("prop")
                    expect(path.isValid()).to.be.false
                })
            })

        })
        describe("makeRootPath", function () {
            const path = Path.makeRootPath()
            expect(path.prim_part).to.equal("/")
            expect(path.prop_part).to.equal("")
            expect(path.isValid()).to.be.true
        })
        describe("isValid()", function () {
            it("Path() -> false", function () {
                const path = new Path()
                expect(path.isValid()).to.be.false
            })
            it("Path('', '') -> false", function () {
                const path = new Path("", "")
                expect(path.isValid()).to.be.false
            })
        })
        // describe("isEmpty()")
        // describe("isPrimPropertyPath()")
    })

    it("BuildDecompressedPathsImpl()", function () {

    })
})

function BuildDecompressedPathsImpl(arg: BuildDecompressedPathsArg): boolean {
    return true
}