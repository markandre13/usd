import { hexdump, parseHexDump } from "../src/detail/hexdump.ts"
import { expect } from "chai"
import { compressToBuffer, decompressFromBuffer, UsdStage } from "../src/index.ts"
import { readFileSync, writeFileSync } from "fs"
import { Reader } from "../src/crate/Reader.ts"
import { SpecType } from "../src/crate/SpecType.ts"
import { CrateDataType } from "../src/crate/CrateDataType.ts"
import { Writer } from "../src/crate/Writer.ts"
import { BootStrap } from "../src/crate/BootStrap.ts"
import { TableOfContents } from "../src/crate/TableOfContents.ts"
import { Section } from "../src/crate/Section.ts"
import { Tokens } from "../src/crate/Tokens.ts"
import { SectionName } from "../src/crate/SectionName.ts"
import { Fields } from "../src/crate/Fields.ts"
import { Crate } from "../src/crate/Crate.ts"
import { Paths } from "../src/crate/Paths.ts"
import { UsdNode } from "../src/crate/UsdNode.ts"
import { Strings } from "../src/crate/Strings.ts"
import { FieldSets } from "../src/crate/FieldSets.ts"
import { Specs } from "../src/crate/Specs.ts"
import { compressBound } from "../src/compression/lz4.ts"
import { decodeIntegers, encodeIntegers } from "../src/compression/integers.ts"
import { Mesh, PseudoRoot, Xform } from "../src/geometry/index.ts"

// UsdObject < UsdProperty < UsdAttribute
//           < UsdPrim

// file layout of cube.udsc is as follows
//   BOOTSTRAP
//   non-inlined values
//   TOKENS
//   STRINGS
//   FIELDS
//   FIELDSETS
//   PATHS
//   SPECS
//   TOC
//   end of file
// assumptions:
// * with the exception of BOOTSTRAP, sections are placed in the order they are created
// * the non-inlined values are placed close to the the beginning of the file to
//   have lower indices, which can be compressed better
// * on the relation of TOKENS and STRINGS
//   * STRINGS might be there to allow for smaller indices
//     this would suggest to place strings at the end of TOKENS
//   * the actual string values are within TOKENS might be there as compressing them together
//     might be more efficient


//
// ATTRIBUTES
//


describe("USD", () => {
    it("read cube.usdc and compare it with cube.json", () => {
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
        // return

        // console.log(stage._crate._nodes[0].getFields().get("documentation")?.getValue(stage._crate))
        // console.log(stage._crate!fields[0].toString())
        // console.log(stage._crate.tokens[stage._crate.fields[0].tokenIndex])
        // console.log(stage._crate.fields[0].valueRep.getValue(stage._crate))

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
    describe("re-create blender 5.0 files", () => {
        it.only("cube-flat-faces.usdc", () => {

            const buffer = readFileSync("spec/examples/cube-flat-faces.usdc")
            const stageIn = new UsdStage(buffer)
            const origPseudoRoot = stageIn.getPrimAtPath("/")!
            const orig = origPseudoRoot.toJSON()

            // console.log(JSON.stringify(orig, undefined, 4))

            // const crate = new Crate()
            // crate.paths._nodes = []

            // // #usda 1.0
            // // (
            // //     doc = "Blender v5.0.1"
            // //     metersPerUnit = 1
            // //     upAxis = "Z"
            // //     defaultPrim = "root"
            // // )
            // const pseudoRoot = new PseudoRoot(crate)
            // pseudoRoot.documentation = "Blender v5.0.1"

            // // FIXME: the dictionay is decoded wrong...
            // // def Xform "root" (
            // //     customData = {
            // //         dictionary Blender = {
            // //             bool generated = 1
            // //         }
            // //     }
            // // ) {
            // const root = new Xform(crate, pseudoRoot, "root")
            // // root.customData = {}

            // //     def Xform "Cube" {
            // //         custom string userProperties:blender:object_name = "Cube"
            // const cube = new Xform(crate, root, "cube")

            // //         def Mesh "Mesh" ( active = true ) {
            // // ...

            // crate.serialize(pseudoRoot)

            // const stage = new UsdStage(Buffer.from(crate.writer.buffer))
            // const pseudoRootIn = stage.getPrimAtPath("/")!.toJSON()

            // compare(pseudoRootIn, orig)
        })
    })
    it("write CrateFile", () => {
        // const stage = new UsdStage()
        // const form = new UsdGeom.Xform()

        const crate = new Crate()

        crate.paths._nodes = []

        const root = new PseudoRoot(crate)
        root.documentation = "Blender v5.0.0"
        root.metersPerUnit = 1.0
        root.upAxis = "Z"

        const xform = new Xform(crate, root, "Cube")

        const mesh = new Mesh(crate, xform, "Cube_001")
        mesh.subdivisionScheme = "none"
        mesh.interpolateBoundary = "none"
        mesh.faceVaryingLinearInterpolation = "none"
        mesh.extent = [
            -1, -1, -1,
            1, 1, 1
        ]
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

        crate.serialize(root)
        writeFileSync("test.usdc", Buffer.from(crate.writer.buffer))

        //
        // READ
        //

        const stage = new UsdStage(Buffer.from(crate.writer.buffer))
        const pseudoRoot = stage.getPrimAtPath("/")!.toJSON()

        const buffer = readFileSync("spec/cube.usdc")
        const orig = new UsdStage(buffer).getPrimAtPath("/")!.toJSON()

        // console.log("%o", pseudoRoot)

        // type
        // name
        // prim
        // fields
        // children
        // console.log(JSON.stringify(pseudoRoot, undefined, 2))
        // console.log(JSON.stringify(orig, undefined, 2))

        compare(pseudoRoot, orig)


        // compare with the blender generated file

        // expect(pseudoRoot).to.not.be.undefined
        // expect(pseudoRoot.getType()).to.equal(SpecType.PseudoRoot)

        // expect(pseudoRoot.toJSON()).to.deep.equal(generatedUSD)
    })
    describe("Crate parts", () => {
        it("BootStrap", () => {
            const writer = new Writer()
            const headerOut = new BootStrap()
            headerOut.serialize(writer)

            const reader = new Reader(writer.buffer)
            const headerIn = new BootStrap(reader)

            expect(headerOut.indent).to.equal(headerIn.indent)
            expect(headerOut.version).to.deep.equal(headerIn.version)
            expect(headerOut.tocOffset).to.equal(headerIn.tocOffset)
        })
        it("TableOfContents & Section", () => {
            const tocOut = new TableOfContents()
            tocOut.addSection(new Section({ name: "A", start: 1, size: 2 }))
            tocOut.addSection(new Section({ name: "B", start: 3, size: 4 }))

            const writer = new Writer()
            tocOut.serialize(writer)

            const reader = new Reader(writer.buffer)
            const tocIn = new TableOfContents(reader)

            // expect(tocOut).to.deep.equal(tocIn)
            expect(tocIn.sections.size).to.equal(tocOut.sections.size)
            expect(tocIn.sections.get("A")).to.deep.equal(tocOut.sections.get("A"))
            expect(tocIn.sections.get("B")).to.deep.equal(tocOut.sections.get("B"))
        })
        describe(SectionName.TOKENS, () => {
            const tokensOut = new Tokens()
            tokensOut.add("Mesh")
            tokensOut.add("Cylinder")

            const writer = new Writer()
            tokensOut.serialize(writer)

            const reader = new Reader(writer.buffer)
            const tokensIn = new Tokens(reader)

            expect(tokensIn.tokens).to.deep.equal(tokensOut.tokens)
        })
        it(SectionName.STRINGS, () => {
            const tokens = new Tokens()
            const stringsOut = new Strings(tokens)
            tokens.add("Xform")
            expect(stringsOut.add("hello")).to.equal(0)
            tokens.add("Mesh")
            expect(stringsOut.add("world")).to.equal(1)

            const writer = new Writer()
            stringsOut.serialize(writer)

            const reader = new Reader(writer.buffer)
            const stringsIn = new Strings(reader, tokens)

            expect(stringsIn.get(0)).to.equal("hello")
            expect(stringsIn.get(1)).to.equal("world")
        })
        it(SectionName.FIELDS, () => {
            const tokens = new Tokens()
            const strings = new Strings(tokens)
            const data = new Writer()
            const fieldsOut = new Fields(tokens, strings, data)
            fieldsOut.setFloat("metersPerUnit", 1)

            const writer = new Writer()
            fieldsOut.serialize(writer)

            // console.log(`ENCODED VALUE REP`)
            // hexdump(new Uint8Array(fieldsIn.valueReps.buffer))

            const reader = new Reader(writer.buffer)
            const fieldsIn = new Fields(reader)

            // console.log(fieldsOut.fields)

            expect(fieldsIn.fields).to.have.lengthOf(1)

            // console.log(`DECODED VALUE REP`)
            // fieldsOut.fields![0].valueRep.hexdump()

            expect(fieldsIn.fields![0].valueRep.getType()).to.equal(CrateDataType.Float)
            expect(fieldsIn.fields![0].valueRep.isInlined()).to.be.true
            expect(fieldsIn.fields![0].valueRep.isArray()).to.be.false
            expect(fieldsIn.fields![0].valueRep.isCompressed()).to.be.false

            // console.log(`${fieldsOut.fields![0]}`)

            const crate = {
                tokens,
                reader
            } as any as Crate

            // console.log(`${fieldsOut.fields![0].valueRep.getValue(crate)}`)
            expect(fieldsIn.fields![0].valueRep.getValue(crate)).to.equal(1)
        })
        it(SectionName.FIELDSETS, () => {
            const fieldsetsOut = new FieldSets()
            fieldsetsOut.fieldset_indices = [0, 1, 2, -1, 3, 4, 5, -1]

            const writer = new Writer()
            fieldsetsOut.serialize(writer)

            const reader = new Reader(writer.buffer)
            const fieldssetIn = new FieldSets(reader)

            expect(fieldssetIn.fieldset_indices).to.deep.equal(fieldsetsOut.fieldset_indices)
        })
        it(SectionName.PATHS, () => {
            const pathsOut = new Paths()
            pathsOut._nodes = []

            const crate = {} as any as Crate

            const pseudoRoot = new UsdNode(crate, undefined, pathsOut._nodes.length, "/", true)
            pseudoRoot.spec_type = SpecType.PseudoRoot
            // pseudoRoot.setDouble("metersPerUnit", 1.0)
            // pseudoRoot.setString("documentation", "Blender v5.0.0")
            // pseudoRoot.setToken("upAxis", "Z")
            // pseudoRoot.setTokenVector("primChildren", ["root"])
            // pseudoRoot.setToken("defaultPrim", "root")
            pathsOut._nodes.push(pseudoRoot)

            const xform = new UsdNode(crate, pseudoRoot, pathsOut._nodes.length, "root", true)
            xform.spec_type = SpecType.Prim
            // xform.setSpecifier("specifier", "Def")
            // xform.setToken("typeName", "Xform")
            // xform.setTokenVector("primChildren", ["Cube", "Sphere"])
            pathsOut._nodes.push(xform)

            const cube = new UsdNode(crate, xform, pathsOut._nodes.length, "Cube", true)
            cube.spec_type = SpecType.Prim
            // cube.setSpecifier("specifier", "Def")
            // xform.setToken("typeName", "Mesh")
            // xform.setTokenVector("properties", ["extent", "faceVertexCounts"])
            pathsOut._nodes.push(cube)
            // type Attribute
            // name:extent
            // fields?
            //   typeName: Token float[]
            const extent = new UsdNode(crate, cube, pathsOut._nodes.length, "extent", true)
            extent.spec_type = SpecType.Attribute
            // extent.setToken("typeName", "float3[]")
            // not a map to ensure the order...?
            //

            // or immediatly create the ValueReps and FieldSet etc???
            // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ this because
            // * performance
            // * my main goal at the moment is writing!!!
            // reading could also be done in a similar way
            // * read and decompress all, build tree as the last final step !!!!!!!!!!!!

            // extent.field.add("typeName", new Token("float3[]"))
            // extend.field.add("default", new Vec3fArray([0,0,0,1,1,1]))
            // since we get the typeName only with the fieldset, we might need to create
            // two trees: one with UsdNode, then one with PseudoRoot, Xform, Mesh, ...
            pathsOut._nodes.push(extent)

            const faceVertexCounts = new UsdNode(crate, cube, pathsOut._nodes.length, "faceVertexCounts", true)
            faceVertexCounts.spec_type = SpecType.Attribute
            // faceVertexCounts.setToken("typeName", "int[]")
            // faceVertexCounts.setIntArray("default", [4,4,4,4,4,4])
            pathsOut._nodes.push(faceVertexCounts)

            const sphere = new UsdNode(crate, xform, pathsOut._nodes.length, "Sphere", true)
            sphere.spec_type = SpecType.Prim
            pathsOut._nodes.push(sphere)

            // pseudoRoot.print()

            const writer = new Writer()
            const tokens = new Tokens()
            // console.log("------------------------------------------ serialize")
            pathsOut.encode(tokens, pseudoRoot)
            pathsOut.serialize(writer)
            // console.log("------------------------------------------")

            const toc = new TableOfContents()
            toc.addSection(new Section({ name: SectionName.PATHS, start: 0, size: writer.tell() }))

            // console.log("------------------------------------------ deserialize")
            const reader = new Reader(writer.buffer)
            const crateOut = {
                toc: toc,
                tokens: tokens.tokens,
                reader
            } as any as Crate
            const pathsIn = new Paths(reader)
            // console.log("------------------------------------------ dump")
            // for(let i=0; i<pathsOut._nodes.length; ++i) {
            //     const n = pathsOut._nodes[i]
            //     console.log(`[${i}] = ${n.name} ${n.index}`)
            // }

            // THIS FAILS BECAUSE NOW THE CRATE BUILDS THE NODES
            // const root = pathsOut._nodes[0]
            // // root.print()

            // expect(pathsOut._nodes).to.have.lengthOf(6)

            // expect(root.name).to.equal("/")
            // expect(root.children[0].name).to.equal("root")
            // expect(root.children[0].children[0].name).to.equal("Cube")
            // expect(root.children[0].children[0].children[0].name).to.equal("extent")
            // expect(root.children[0].children[0].children[1].name).to.equal("faceVertexCounts")
            // expect(root.children[0].children[1].name).to.equal("Sphere")
        })
        it(SectionName.SPECS, () => {
            const specsOut = new Specs()
            specsOut.pathIndexes = [0, 1, 2]
            specsOut.fieldsetIndexes = [3, 4, 5]
            specsOut.specTypeIndexes = [6, 7, 8]

            const writer = new Writer()
            specsOut.serialize(writer)

            const reader = new Reader(writer.buffer)
            const specsIn = new Specs(reader)

            expect(specsIn).to.deep.equal(specsOut)
        })
    })
    describe("Reader & Writer", () => {
        it("grows on demand", () => {
            const flex = new Writer(8)
            for (let i = 0; i < 20; ++i) {
                flex.writeUint8(i)
            }
            expect(flex.buffer).to.deep.equal(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]).buffer)
        })
        describe("compressedInts", () => {
            it("Reader.readCompressedInts()", () => {
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
                    69, 11, 56, 11, 56, 56, 73, 11, 56, 56, 56, 11, 56, 11, 56]

                expect(result).to.deep.equal(want)
                expect(reader.offset).to.equal(compressed.byteLength)
            })
            it("Writer.writeCompressedInts()", () => {
                const uncompressed = [2, 3, 5, 7, 9, 10, 11, 13, 7, 19, 7, 11, 22, 24, 19, 11,
                    7, 11, 7, 19, 11, 19, 11, 19, 11, 55, 56, 11, 56, 11, 56, 56,
                    11, 56, 11, 56, 56, 11, 56, 56, 56, 56, 11, 56, 65, 11, 56, 67,
                    69, 11, 56, 11, 56, 56, 73, 11, 56, 56, 56, 11, 56, 11, 56,]

                const writer = new Writer()
                writer.writeCompressedIntegers(uncompressed)

                const compressed = parseHexDump(`
                    0000 3f 00 00 00 00 00 00 00 47 00 00 00 00 00 00 00 ?.......G.......
                    0010 00 52 2d 00 00 00 55 01 00 f0 18 44 11 45 15 45 .R-...U....D.E.E
                    0020 45 54 54 04 02 01 02 02 02 01 01 02 fa 0c f4 04 ETT.............
                    0030 0b 02 fb f8 fc 04 fc 0c f8 08 f8 08 f8 2c 01 d3 .............,..
                    0040 d3 00 03 00 f0 02 00 00 00 d3 09 ca 0b 02 c6 d3 ................
                    0050 00 11 c2 00 00 d3 d3                            .......
                `)
                expect(new Uint8Array(writer.buffer)).to.deep.equal(compressed)

                const reader = new Reader(writer.buffer)
                const result = reader.getCompressedIntegers()
                expect(result).to.deep.equal(uncompressed)
            })
        })
    })
    describe("compression", () => {
        describe("LZ4", () => {
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
            it("decompressFromBuffer(src, dst)", () => {
                const uncompressed = new Uint8Array(dst.length)
                const n = decompressFromBuffer(src, uncompressed)
                expect(n).to.equal(dst.length)
                expect(uncompressed).to.deep.equal(dst)
            })
            it("compressToBuffer(src, dst)", () => {
                const compressed = new Uint8Array(compressBound(dst.length + 1))
                const n = compressToBuffer(dst, compressed)
                expect(n).to.equal(src.length)
                expect(new Uint8Array(compressed.buffer, 0, n)).to.deep.equal(src)
            })
        })
        describe("integers", () => {
            it("simple", () => {
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
            it("decodeIntegers() with overflow in prevVal", () => {
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
            it("encodeIntegers()", () => {
                const decoded = [
                    2, 3, 5, 7, 9, 10, 11, 13, 7, 19, 7, 11, 22, 24, 19, 11,
                    7, 11, 7, 19, 11, 19, 11, 19, 11, 55, 56, 11, 56, 11, 56, 56,
                    11, 56, 11, 56, 56, 11, 56, 56, 56, 56, 11, 56, 65, 11, 56, 67,
                    69, 11, 56, 11, 56, 56, 73, 11, 56, 56, 56, 11, 56, 11, 56]
                const buffer = new Uint8Array(decoded.length * 3)
                const encoded = new DataView(buffer.buffer)
                const n = encodeIntegers(decoded, encoded)
                const yyy = parseHexDump(`
                        0000 2d 00 00 00 55 55 55 55 55 55 55 44 11 45 15 45 -...UUUUUUUD.E.E
                        0010 45 54 54 04 02 01 02 02 02 01 01 02 fa 0c f4 04 ETT.............
                        0020 0b 02 fb f8 fc 04 fc 0c f8 08 f8 08 f8 2c 01 d3 .............,..
                        0030 d3 00 d3 d3 00 d3 00 00 00 d3 09 ca 0b 02 c6 d3 ................
                        0040 00 11 c2 00 00 d3 d3                            .......         
                    `)
                expect(new Uint8Array(buffer.buffer, 0, n)).to.deep.equal(yyy)
            })
        })
    })
})

const generatedUSD = {
    "type": "PseudoRoot",
    "name": "/",
    "prim": true,
    "fields": {
        "documentation": {
            "type": "String",
            "inline": true,
            "array": false,
            "compressed": false,
            "value": "Blender v5.0.0"
        },
        "metersPerUnit": {
            "type": "Float",
            "inline": true,
            "array": false,
            "compressed": false,
            "value": 3.1414999961853027
        },
        "upAxis": {
            "type": "Token",
            "inline": true,
            "array": false,
            "compressed": false,
            "value": "Z"
        }
    },
    "children": [
        {
            "type": "Prim",
            "name": "Cube",
            "prim": true,
            "fields": {
                "specifier": {
                    "type": "Specifier",
                    "inline": true,
                    "array": false,
                    "compressed": false,
                    "value": "Def"
                },
                "typeName": {
                    "type": "Token",
                    "inline": true,
                    "array": false,
                    "compressed": false,
                    "value": "Xform"
                }
            },
            "children": [
                {
                    "type": "Prim",
                    "name": "Cube_001",
                    "prim": true,
                    "fields": {
                        "specifier": {
                            "type": "Specifier",
                            "inline": true,
                            "array": false,
                            "compressed": false,
                            "value": "Def"
                        },
                        "typeName": {
                            "type": "Token",
                            "inline": true,
                            "array": false,
                            "compressed": false,
                            "value": "Mesh"
                        },
                        "properties": {
                            "type": "TokenVector",
                            "inline": false,
                            "array": false,
                            "compressed": false,
                            "value": [
                                "faceVertexIndices",
                                "faceVertexCounts"
                            ]
                        }
                    },
                    "children": [
                        {
                            "type": "Attribute",
                            "name": "faceVertexIndices",
                            "prim": false,
                            "fields": {
                                "typeName": {
                                    "type": "Token",
                                    "inline": true,
                                    "array": false,
                                    "compressed": false,
                                    "value": "int[]"
                                },
                                "default": {
                                    "type": "Int",
                                    "inline": false,
                                    "array": true,
                                    "compressed": false,
                                    "value": [
                                        0, 1, 3, 2,
                                        2, 3, 7, 6,
                                        6, 7, 5, 4,
                                        4, 5, 1, 0,
                                        2, 6, 4, 0,
                                        7, 3, 1, 5
                                    ]
                                }
                            }
                        },
                        {
                            "type": "Attribute",
                            "name": "faceVertexCounts",
                            "prim": false,
                            "fields": {
                                "typeName": {
                                    "type": "Token",
                                    "inline": true,
                                    "array": false,
                                    "compressed": false,
                                    "value": "int[]"
                                },
                                "default": {
                                    "type": "Int",
                                    "inline": false,
                                    "array": true,
                                    "compressed": false,
                                    "value": [4, 4, 4, 4, 4, 4]
                                }
                            }
                        }
                    ]
                }
            ]
        }
    ]
}

// this is the thing i still need to write
function compare(lhs: any, rhs: any, path: string = "") {
    // console.log(`compare ${lhs}: ${typeof lhs}, ${rhs}: ${typeof rhs}, ${path}`)
    if (typeof lhs !== typeof rhs) {
        throw Error(`${path} lhs is of type ${typeof lhs} while rhs is of type ${rhs}`)
    }
    if (typeof lhs !== "object") {
        if (lhs !== rhs) {
            throw Error(`${path}: ${lhs} !== ${rhs}`)
        }
        return
    }
    if (lhs === undefined && rhs === undefined) {
        console.log(`${path}: lhs === rhs === undefined`)
        return
    }
    for (const name of Object.getOwnPropertyNames(lhs)) {
        if (rhs[name] === undefined) {
            throw Error(`yikes: ${path}.${name} is missing in rhs`)
        }
    }
    for (const name of Object.getOwnPropertyNames(rhs)) {
        if (lhs[name] === undefined) {
            throw Error(`yikes: ${path}.${name} is missing in lhs`)
        }
    }
    for (const name of Object.getOwnPropertyNames(lhs)) {
        const fa = lhs[name]
        const fb = rhs[name]
        compare(fa, fb, `${path}.${name}`)
    }
}
