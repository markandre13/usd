import { hexdump, parseHexDump } from "../src/detail/hexdump.ts"
import { expect } from "chai"
import { decodeIntegers, decompressFromBuffer, readCompressedInts, UsdStage, type BuildDecompressedPathsArg } from "../src/index.ts"
import { Path } from "../src/path/Path.ts"
import { readFileSync } from "fs"
import { Reader } from "../src/crate/Reader.ts"
import { CrateFile, SpecType } from "../src/crate/CrateFile.ts"

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
        // for (let i = 0; i < crate._paths!.length; ++i) {
        //     const p = crate._paths![i]
        //     console.log(`path[${i}] = ${p ? p.getFullPathName() : "undefined"}`)
        // }
        expect(crate._paths).to.not.be.undefined
        expect(crate._paths).to.have.lengthOf(35)
        expect(crate._paths![0].getFullPathName()).to.equal("/")
        expect(crate._paths![1].getFullPathName()).to.equal("/root")
       
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

        // #usda 1.0
        // ( doc = "Blender v4.5.2 LTS", metersPerUnit = 1, upAxis = "Z", defaultPrim = "root" )
        // def Xform "root" ( customData = { dictionary Blender = { bool generated = 1 } } ) {
        //     def Xform "Cube" {
        //         custom string userProperties:blender:object_name = "Cube"
        //         def Mesh "Mesh" ( active = true, prepend apiSchemas = ["MaterialBindingAPI"]) {
        //             point3f[] points = [(1, 1, 1), (1, 1, -1), (1, -1, 1), (1, -1, -1), (-1, 1, 1), (-1, 1, -1), (-1, -1, 1), (-1, -1, -1), (1, -1, 1), (-1, -1, 1), (1, 1, 1), (-1, 1, 1)]
        //             normal3f[] normals = [(0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, -1, 0), (0, -1, 0), (0, -1, 0), (0, -1, 0), (-1, 0, 0), (-1, 0, 0), (-1, 0, 0), (-1, 0, 0), (0, 0, -1), (0, 0, -1), (0, 0, -1), (0, 0, -1), (1, 0, 0), (1, 0, 0), (1, 0, 0), (1, 0, 0), (0, 1, 0), (0, 1, 0), (0, 1, 0), (0, 1, 0), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1)](
        //                 interpolation = "faceVarying"
        //             )
        //             int[] faceVertexIndices = [
        //                 6, 2, 8, 9, 3,    2, 6, 7, 7, 6, 
        //                 4, 5, 5, 1, 3,    7, 1, 0, 2, 3,
        //                 5, 4, 0, 1, 10,  11, 9, 8, 4, 6,
        //                 9, 11, 2, 0, 10,  8, 0, 4, 11, 10]
        //             int[] faceVertexCounts = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
        //             uniform token subdivisonScheme = "none"
        //             uniform bool doubleSided = 1
        //             float3[] extent = [(-1, -1, -1), (1, 1, 1)]
        //             rel material:binding = </root/_materials/Material>
        //             texCoord2f[] primvars:st = [(0.625, 1), (0.625, 0.75), (0.625, 0.75), (0.625, 1), (0.375, 0.75), (0.625, 0.75), (0.625, 1), (0.375, 1), (0.375, 0), (0.625, 0), (0.625, 0.25), (0.375, 0.25), (0.125, 0.5), (0.375, 0.5), (0.375, 0.75), (0.125, 0.75), (0.375, 0.5), (0.625, 0.5), (0.625, 0.75), (0.375, 0.75), (0.375, 0.25), (0.625, 0.25), (0.625, 0.5), (0.375, 0.5), (0.625, 0.5), (0.875, 0.5), (0.875, 0.75), (0.625, 0.75), (0.625, 0.25), (0.625, 0), (0.625, 0), (0.625, 0.25), (0.625, 0.75), (0.625, 0.5), (0.625, 0.5), (0.625, 0.75), (0.625, 0.5), (0.625, 0.25), (0.625, 0.25), (0.625, 0.5)] (
        //                 interpolation = "faceVarying"
        //             )
        //             custom string userProperties:blender:data_name = "Mesh"
        //         }
        //     }
        //     def Scope "_materials" {
        //         def Material "Material" {
        //             token outputs:surface.connect = </root/_materials/Material/Principled_BSDF.outputs:surface>
        //             custom string userProperties:blender:data_name = "Material"
        //             def Shader "Principled_BSDF" {
        //                 uniform token info:id = "UsdPreviewSurface"
        //                 color3f inputs:diffuseColor = (0.8, 0.8, 0.8)
        //                 float inputs:ior = 1.45
        //                 float inputs:metallic = 0
        //                 float inputs:clearcoat = 0
        //                 float inputs:clearcoatRoughness = 0.03
        //                 float inputs:roughness = 0.5
        //                 float inputs:opacity = 1
        //                 token outputs:surface
        //                 float inputs:specular = 0.5
        //             }
        //         }
        //     }
        //     def DomeLight "env_light" {
        //         float inputs:intensity = 1
        //         float3 xformOp:rotateXYZ = (90, 0, 90)
        //         uniform token[] xformOpOrder = ["xformOp:rotateXYZ"]
        //         asset inputs:texture:file = @./textures/color_121212.hdr@
        //     }
        // }
    })

    describe("API", function() {
        it.only("xxx", function() {
            // from pxr import Usd, UsdGeom
            // stage = Usd.Stage.CreateNew('HelloWorld.usda')
            // xformPrim = UsdGeom.Xform.Define(stage, '/hello')
            // spherePrim = UsdGeom.Sphere.Define(stage, '/hello/world')
            // stage.GetRootLayer().Save()

            const buffer = readFileSync("cube.usdc")
            const stage = new UsdStage(buffer)

            console.log(`=======================================`)

            // stage.getPrimAtPath("/")
            const mesh = stage.getPrimAtPath("/root/Cube/Mesh")
            expect(mesh?.name).to.equal("Mesh")
            // mesh!.getAttribute("extend")
            const extent = mesh?.getAttribute("extent")
            expect(extent).to.not.be.undefined

            const spec = stage._crate._specs[extent!.spec_index!]
            console.log(SpecType[spec.spec_type])
            stage._crate.ReconstructStageMeta(spec.fieldset_index)

            // stage._crate.

            // console.log(mesh?.getAttribute("extent"))
            // mesh?.print()

            // def <type> <name> ( ... ) { ... }

            //  def Xform "root" ( ... ) {
            //     def Xform "Cube" {
            //         def Mesh "Mesh" ( act

            // https://openusd.org/release/api/class_usd_geom_mesh.html
        })
    })

    describe("detail", function () {
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
        it("makeRootPath", function () {
            const path = Path.makeRootPath()
            expect(path.prim_part()).to.equal("/")
            expect(path.prop_part()).to.equal("")
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
        describe("append_property(element: string)", function () {
            it("element is empty -> invalid", function () {
                const path = Path.makeRootPath()
                path.append_property("")
                expect(path.isValid()).to.be.false
            })
            it("xxx", function() {
                const path = Path.makeRootPath()
                path.append_property("aa")
                expect(path.isValid()).to.be.true
                expect(path.prop_part()).is.equal("aa")
                expect(path._element).is.equal("aa")
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