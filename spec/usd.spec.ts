import { hexdump, parseHexDump } from "../src/detail/hexdump.ts"
import { expect } from "chai"
import { compressToBuffer, decodeIntegers, decompressFromBuffer, encodeIntegers, UsdStage } from "../src/index.ts"
import { readFileSync } from "fs"
import { Reader } from "../src/crate/Reader.ts"
import { SpecType } from "../src/crate/SpecType.ts"
import { UsdNode } from "../src/crate/UsdNode.ts"
import { CrateDataType } from "../src/crate/CrateDataType.ts"
import { UsdGeom, Writer } from "../src/crate/Writer.ts"
import { writer } from "repl"
import { BootStrap } from "../src/crate/BootStrap.ts"
import { TableOfContents } from "../src/crate/TableOfContents.ts"
import { Section } from "../src/crate/Section.ts"
import { Tokens } from "../src/crate/Tokens.ts"
import { SectionName } from "../src/crate/SectionName.ts"
import { compressBlock, compressBound, decompressBlock } from "../src/crate/lz4.ts"

// https://github.com/lighttransport/tinyusdz
// mkdir build
// cd build
// cmake ..
// make -j12
// ./tusdcat /Users/mark/js/usd/cube.usdc

// readfields -> readcompressedint -> de

// UsdObject ;; GetAllMetadata(), points to stage
//   UsdPrim
//   UsdProperty
//   UsdAttribute: UsdProperty
//   UsdReleationship: UsdProperty

// field / metadata

describe("USD", function () {
    it("write CrateFile", function () {
        const stage = new UsdStage()
        const form = new UsdGeom.Xform()

        const mesh = new UsdGeom.Mesh()
        mesh.points = [
            -1, -1, -1,
            -1, -1, 1,
            -1, 1, -1,
            -1, 1, 1,
            1, -1, -1,
            1, -1, 1,
            1, 1, -1,
            1, 1, 1
        ]
        mesh.normals = [
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0,
            -1, 0, 0,

            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,

            1, 0, 0,
            1, 0, 0,
            1, 0, 0,
            1, 0, 0,

            0, -1, 0,
            0, -1, 0,
            0, -1, 0,
            0, -1, 0,

            0, 0, -1,
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,

            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1
        ]
        mesh.faceVertexIndices = [
            0, 1, 3, 2,
            2, 3, 7, 6,
            6, 7, 5, 4,
            4, 5, 1, 0,
            2, 6, 4, 0,
            7, 3, 1, 5]
        mesh.faceVertexCounts = [4, 4, 4, 4, 4, 4]

        const writer = new Writer()
        mesh.serialize(writer)
    })
    describe("BootStrap", function () {
        it("read/write", function () {
            const writer = new Writer()
            const bout = new BootStrap(writer)

            const reader = new Reader(writer.buffer)
            const bin = new BootStrap(reader)

            expect(bout.indent).to.equal(bin.indent)
            expect(bout.version).to.deep.equal(bin.version)
            expect(bout.tocOffset).to.equal(bin.tocOffset)
        })
    })
    describe("TableOfContents & Section", function () {
        it("read/write", function () {
            const tocIn = new TableOfContents()
            tocIn.addSection(new Section({ name: "A", start: 1, size: 2 }))
            tocIn.addSection(new Section({ name: "B", start: 3, size: 4 }))

            const writer = new Writer()
            tocIn.serialize(writer)

            const reader = new Reader(writer.buffer)
            const tocOut = new TableOfContents(reader)

            // expect(tocOut).to.deep.equal(tocIn)
            expect(tocOut.sections.size).to.equal(tocIn.sections.size)
            expect(tocOut.sections.get("A")).to.deep.equal(tocIn.sections.get("A"))
            expect(tocOut.sections.get("B")).to.deep.equal(tocIn.sections.get("B"))
        })
    })
    describe("Tokens", function () {
        it("read/write", function () {
            const tokensIn = new Tokens()
            tokensIn.add("Mesh")
            tokensIn.add("Cylinder")

            const writer = new Writer()
            tokensIn.serialize(writer)
            const toc = new TableOfContents()
            toc.addSection(new Section({ name: SectionName.TOKENS, start: 0, size: writer.offset }))

            const reader = new Reader(writer.buffer)
            const tokensOut = new Tokens(reader, toc)

            expect(tokensOut.tokens).to.deep.equal(tokensIn.tokens)
        })
    })

    it("Crate file", function () {

        const buffer = readFileSync("spec/cube.usdc")
        const stage = new UsdStage(buffer)

        const pseudoRoot = stage.getPrimAtPath("/")!
        expect(pseudoRoot).to.not.be.undefined
        expect(pseudoRoot.getType()).to.equal(SpecType.PseudoRoot)

        const mesh = stage.getPrimAtPath("/root/Cube/Cube_001")!
        expect(mesh).to.not.be.undefined
        expect(mesh.getType()).to.equal(SpecType.Prim)

        const faceVertexIndices = mesh.getAttribute("faceVertexIndices")!
        expect(faceVertexIndices).to.not.be.undefined
        expect(faceVertexIndices.getType()).to.equal(SpecType.Attribute)

        const materialBinding = mesh.getRelationship("material:binding")!
        expect(materialBinding).to.not.be.undefined
        expect(materialBinding.getType()).to.equal(SpecType.Relationship)
        // console.log(JSON.stringify(materialBinding, undefined, 4))

        // console.log(JSON.stringify(pseudoRoot, undefined))

        const json = JSON.parse(readFileSync("spec/cube.json").toString())
        // console.log(JSON.stringify(pseudoRoot.toJSON()))
        expect(pseudoRoot.toJSON()).to.deep.equal(json)

        /*
            openusd: /pxr/usd/bin/usdcat/usdcat.cpp
            // stage = UsdStage::Open(input);
            // layer = SdfLayer::FindOrOpen(input);

            stage is the top. might be one file, or that one file might included other files

            stage (file)
              layer (file)
                prims

            stage presents the scenegraph, which is a tree of prims
            stage
              root
                usd files
                  prims

            there's the python api!

            from pxr import Usd
            stage = Usd.Stage.CreateNew('HelloWorldRedux.usda')
            xform = stage.DefinePrim('/hello', 'Xform')
            sphere = stage.DefinePrim('/hello/world', 'Sphere')
            stage.GetRootLayer().Save()

            #usda 1.0

            def Xform "hello"
            {
                def Sphere "world"
                {
                }
            }

            from pxr import Usd, Vt
            stage = Usd.Stage.Open('HelloWorld.usda')
            xform = stage.GetPrimAtPath('/hello')
            sphere = stage.GetPrimAtPath('/hello/world')
            
            xform.GetPropertyNames()

            >>> extentAttr = sphere.GetAttribute('extent')
            >>> extentAttr.Get()
            Vt.Vec3fArray(2, (Gf.Vec3f(-1.0, -1.0, -1.0), Gf.Vec3f(1.0, 1.0, 1.0)))

            >>> radiusAttr = sphere.GetAttribute('radius')
            >>> radiusAttr.Set(2)
            True
            >>> extentAttr.Set(extentAttr.Get() * 2)

            usd-core

            # Create a new, empty USD stage where 3D scenes are assembled
            Usd.Stage.CreateNew()
            
            # Open an existing USD file as a stage
            Usd.Stage.Open()
            
            # Saves all layers in a USD stage
            Usd.Stage.Save()

            https://docs.nvidia.com/learn-openusd/latest/stage-setting/usd-modules.html

            * The USD code repository is made up of four core packages: base, usd, imaging, and usdImaging.
            * to read/write usd data, the packages base and usd are needed
            * When authoring or querying USD data, you will almost always use a few common USD modules such as Usd, Sdf, and Gf along with some schema modules.
            * Schemas are grouped into schema domains and each domain has its own module. The schema modules you use will depend on the type of scene description you’re working with. For example, UsdGeom for geometry data, UsdShade for materials and shaders, and UsdPhysics for physics scene description.
         */

        // ( ... ) : field set
    })

    describe("compression", function () {
        describe("LZ4", function () {
            const src = parseHexDump(`
                0000 00 52 2d 00 00 00 55 01 00 f0 18 44 11 45 15 45 .R-...U....D.E.E
                0010 45 54 54 04 02 01 02 02 02 01 01 02 fa 0c f4 04 ETT.............
                0020 0b 02 fb f8 fc 04 fc 0c f8 08 f8 08 f8 2c 01 d3 .............,..
                0030 d3 00 03 00 f0 02 00 00 00 d3 09 ca 0b 02 c6 d3 ................
                0040 00 11 c2 00 00 d3 d3                            .......         `)
            const dst = parseHexDump(`
                0000 2d 00 00 00 55 55 55 55 55 55 55 44 11 45 15 45 -...UUUUUUUD.E.E
                0010 45 54 54 04 02 01 02 02 02 01 01 02 fa 0c f4 04 ETT.............
                0020 0b 02 fb f8 fc 04 fc 0c f8 08 f8 08 f8 2c 01 d3 .............,..
                0030 d3 00 d3 d3 00 d3 00 00 00 d3 09 ca 0b 02 c6 d3 ................
                0040 00 11 c2 00 00 d3 d3                                            `)
            it("decompressFromBuffer(src, dst)", function () {
                const uncompressed = new Uint8Array(dst.length)
                const n = decompressFromBuffer(src, uncompressed)
                expect(n).to.equal(dst.length)
                expect(uncompressed).to.deep.equal(dst)
            })
            it("compressToBuffer(src, dst)", function () {
                const compressed = new Uint8Array(compressBound(dst.length + 1))
                const n = compressToBuffer(dst, compressed)
                expect(n).to.equal(src.length)
                expect(new Uint8Array(compressed.buffer, 0, n)).to.deep.equal(src)
            })
            describe("regression", function () {
                it("compress 1 byte", function () {
                    const compressed = parseHexDump(`  0000 10 4d                                           .M`)
                    const uncompressed = parseHexDump(`0000 4d                                              M`)
                    const out = new Uint8Array(4096)
                    const n = compressBlock(uncompressed, out, 0, uncompressed.length)
                    expect(new Uint8Array(out.buffer, 0, n)).to.deep.equal(compressed)
                })
                it("compress 17 bytes", function () {
                    const compressed = parseHexDump(`
                        0000 f0 02 4d 65 73 68 43 79 6c 69 6e 64 65 72 53 70 ..MeshCylinderSp
                        0010 68 65 72                                        her       
                    `)
                    const uncompressed = parseHexDump(`
                        0000 4d 65 73 68 43 79 6c 69 6e 64 65 72 53 70 68 65 MeshCylinderSphe
                        0010 72  
                    `)
                    const out = new Uint8Array(4096)
                    const n = compressBlock(uncompressed, out, 0, uncompressed.length)
                    expect(new Uint8Array(out.buffer, 0, n)).to.deep.equal(compressed)
                })
                it("decompress 1 byte", function () {
                    const compressed = parseHexDump(`  0000 10 4d                                           .M`)
                    const uncompressed = parseHexDump(`0000 4d                                              M`)
                    const out = new Uint8Array(4096)
                    const n = decompressBlock(compressed, out, 0, compressed.length, 0)
                    expect(new Uint8Array(out.buffer, 0, n)).to.deep.equal(uncompressed)
                })
                it("decompress 2 bytes", function () {
                    const compressed = parseHexDump(`  0000 20 4d 65                                         Me`)
                    const uncompressed = parseHexDump(`0000 4d 65                                           Me`)
                    const out = new Uint8Array(4096)
                    const n = decompressBlock(compressed, out, 0, compressed.length, 0)
                    expect(new Uint8Array(out.buffer, 0, n)).to.deep.equal(uncompressed)
                })
                it("decompress 14 bytes", function () {
                    const compressed = parseHexDump(`  0000 e0 4d 65 73 68 43 79 6c 69 6e 64 65 72 53 70    .MeshCylinderSp`)
                    const uncompressed = parseHexDump(`0000 4d 65 73 68 43 79 6c 69 6e 64 65 72 53 70       MeshCylinderSp`)
                    const out = new Uint8Array(4096)
                    const n = decompressBlock(compressed, out, 0, compressed.length, 0)
                    expect(new Uint8Array(out.buffer, 0, n)).to.deep.equal(uncompressed)
                })
                it("decompress 15 bytes", function () {
                    const compressed = parseHexDump(`
                        0000 f0 00 4d 65 73 68 43 79 6c 69 6e 64 65 72 53 70 ..MeshCylinderSp
                        0010 68  `
                    )
                    const uncompressed = parseHexDump(`
                        0000 4d 65 73 68 43 79 6c 69 6e 64 65 72 53 70 68    MeshCylinderSph
                    `)
                    const out = new Uint8Array(4096)
                    const n = decompressBlock(compressed, out, 0, compressed.length, 0)
                    expect(new Uint8Array(out.buffer, 0, n)).to.deep.equal(uncompressed)
                })
                it("decompress 16 bytes", function () {
                    const compressed = parseHexDump(`
                        0000 f0 01 4d 65 73 68 43 79 6c 69 6e 64 65 72 53 70 ..MeshCylinderSp
                        0010 68 65                                           he 
                    `)
                    const uncompressed = parseHexDump(`
                        0000 4d 65 73 68 43 79 6c 69 6e 64 65 72 53 70 68 65 MeshCylinderSphe
                    `)
                    const out = new Uint8Array(4096)
                    const n = decompressBlock(compressed, out, 0, compressed.length, 0)
                    expect(new Uint8Array(out.buffer, 0, n)).to.deep.equal(uncompressed)
                })
                it("decompress 17 bytes", function () {
                    const compressed = parseHexDump(`
                        0000 f0 02 4d 65 73 68 43 79 6c 69 6e 64 65 72 53 70 ..MeshCylinderSp
                        0010 68 65 72                                        her       
                    `)
                    const uncompressed = parseHexDump(`
                        0000 4d 65 73 68 43 79 6c 69 6e 64 65 72 53 70 68 65 MeshCylinderSphe
                        0010 72  
                    `)
                    const out = new Uint8Array(4096)
                    const n = decompressBlock(compressed, out, 0, compressed.length, 0)
                    expect(new Uint8Array(out.buffer, 0, n)).to.deep.equal(uncompressed)
                })
            })
        })

        describe("integers", function () {
            describe("decodeIntegers()", function () {
                it("simple", function () {
                    const encoded = parseHexDump(`
                        0000 2d 00 00 00 55 55 55 55 55 55 55 44 11 45 15 45 -...UUUUUUUD.E.E
                        0010 45 54 54 04 02 01 02 02 02 01 01 02 fa 0c f4 04 ETT.............
                        0020 0b 02 fb f8 fc 04 fc 0c f8 08 f8 08 f8 2c 01 d3 .............,..
                        0030 d3 00 d3 d3 00 d3 00 00 00 d3 09 ca 0b 02 c6 d3 ................
                        0040 00 11 c2 00 00 d3 d3
                    `)

                    const result = decodeIntegers(new DataView(encoded.buffer), 63)

                    const decoded = [
                        2, 3, 5, 7, 9, 10, 11, 13, 7, 19, 7, 11, 22, 24, 19, 11,
                        7, 11, 7, 19, 11, 19, 11, 19, 11, 55, 56, 11, 56, 11, 56, 56,
                        11, 56, 11, 56, 56, 11, 56, 56, 56, 56, 11, 56, 65, 11, 56, 67,
                        69, 11, 56, 11, 56, 56, 73, 11, 56, 56, 56, 11, 56, 11, 56]

                    expect(result).to.deep.equal(decoded)
                })

                it("decodeIntegers() with overflow in prevVal", function () {
                    const encoded = parseHexDump(`
                        0000 fd ff ff ff 55 55 55 40 55 55 44 54 15 01 07 08 ....UUU@UUDT....
                        0010 dc 29 ca 03 04 ff fb 03 04 33 13 b6 04 47 b3 f9 .).......3...G..
                        0020 ff 07 02 02 08 38 bb 01 fe ff                   .....8....     
                    `)

                    const result = decodeIntegers(new DataView(encoded.buffer), 35)

                    const want = [
                        1, 8, 16, -20, 21, -33, -30, -26, -27, -32, -29, -25, -28, -31, -34, 17,
                        36, -38, -34, 37, -40, -47, -48, -41, -44, -42, -45, -43, -46, -38, 18, -51,
                        -50, -52, -53,]

                    expect(result).to.deep.equal(want)
                })

                it("encodeIntegers()", function () {
                    const decoded = [
                        2, 3, 5, 7, 9, 10, 11, 13, 7, 19, 7, 11, 22, 24, 19, 11,
                        7, 11, 7, 19, 11, 19, 11, 19, 11, 55, 56, 11, 56, 11, 56, 56,
                        11, 56, 11, 56, 56, 11, 56, 56, 56, 56, 11, 56, 65, 11, 56, 67,
                        69, 11, 56, 11, 56, 56, 73, 11, 56, 56, 56, 11, 56, 11, 56]

                    const buffer = new Uint8Array(decoded.length * 3)
                    const encoded = new DataView(buffer.buffer)

                    const n = encodeIntegers(decoded, encoded)

                    const out = decodeIntegers(encoded, decoded.length)
                    // console.log(out)
                    expect(out).to.deep.equal(decoded)
                })
            })

            it("Reader.readCompressedInts()", function () {
                const compressed = parseHexDump(`
                    0000 47 00 00 00 00 00 00 00 00 52 2d 00 00 00 55 01 G........R-...U.
                    0010 00 f0 18 44 11 45 15 45 45 54 54 04 02 01 02 02 ...D.E.EETT.....
                    0020 02 01 01 02 fa 0c f4 04 0b 02 fb f8 fc 04 fc 0c ................
                    0030 f8 08 f8 08 f8 2c 01 d3 d3 00 03 00 f0 02 00 00 .....,..........
                    0040 00 d3 09 ca 0b 02 c6 d3 00 11 c2 00 00 d3 d3    ...............
                    `)
                const reader = new Reader(new DataView(compressed.buffer))
                const result = reader.getCompressedIntegers(63)
                const want = [2, 3, 5, 7, 9, 10, 11, 13, 7, 19, 7, 11, 22, 24, 19, 11,
                    7, 11, 7, 19, 11, 19, 11, 19, 11, 55, 56, 11, 56, 11, 56, 56,
                    11, 56, 11, 56, 56, 11, 56, 56, 56, 56, 11, 56, 65, 11, 56, 67,
                    69, 11, 56, 11, 56, 56, 73, 11, 56, 56, 56, 11, 56, 11, 56,]

                expect(result).to.deep.equal(want)
                expect(reader.offset).to.equal(compressed.byteLength)
            })
        })
    })
})
