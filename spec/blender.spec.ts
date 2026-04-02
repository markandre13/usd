import { Stage } from "../src/crate/Stage"
import { readFileSync, writeFileSync } from "fs"
import { GeomSubset } from "../src/nodes/geometry/GeomSubset"
import { Mesh } from "../src/nodes/geometry/Mesh"
import { DomeLight } from "../src/nodes/lux/DomeLight"
import { SphereLight } from "../src/nodes/lux/SphereLight"
import { Scope } from "../src/nodes/geometry/Scope"
import { Camera } from "../src/nodes/geometry/Camera"
import { Skeleton } from "../src/nodes/skeleton/Skeleton"
import { SkelRoot } from "../src/nodes/skeleton/SkelRoot"
import { Xform } from "../src/nodes/geometry/Xform"
import { PseudoRoot } from "../src/nodes/usd/PseudoRoot"
import { stringify } from "./stringify"
import { ImageTexture } from "../src/nodes/shader/blender/ImageTexture"
import { PrincipledBSDF } from "../src/nodes/shader/blender/PrincipledBSDF"
import { UVMap } from "../src/nodes/shader/blender/UVMap"
import { Crate } from "../src/crate/Crate"
import { Attribute } from "../src/nodes/attributes/Attribute"
import { Material } from "../src/nodes/shader/Material"
import { BlendShape } from "../src/nodes/skeleton/BlendShape"
import { SkelAnimation } from "../src/nodes/skeleton/SkelAnimation"
import { CrateDataType } from "../src/crate/CrateDataType"
import { Variability } from "../src/crate/Variability"

/**
 * re-create USDC files generated with blender 5.x
 * features covered are those needed by makehuman.js
 * 
 * during development i compared json files with these commands:
 * - diff -y --color=always -W 180 spec/examples/cube-colored-faces.json constructed.json | less -r
 * - diff -u --color=always -W 180 spec/examples/cube-colored-faces.json constructed.json | less -r
 */
describe("re-create blender 5.0 files", () => {
    it("cube-flat-faces.usdc", () => {
        const prefix = "spec/examples/cube-flat-faces"
        // read the original
        // const buffer = readFileSync(`${prefix}.usdc`)
        // const stageIn = new Stage(buffer)
        // const origPseudoRoot = stageIn.getPrimAtPath("/")!
        // const orig = origPseudoRoot.toJSON()
        // console.log(JSON.stringify(orig, undefined, 4))
        // writeFileSync(`${prefix}.json`, stringify(orig, {indent: 4}))

        // read an adjusted, good enough variant of the original's JSON
        const buffer = readFileSync(`${prefix}.json`)
        const orig = JSON.parse(buffer.toString())

        const crate = new Crate()

        const pseudoRoot = new PseudoRoot(crate)
        pseudoRoot.documentation = "Blender v5.0.1"
        pseudoRoot.defaultPrim = "root"

        const root = new Xform(pseudoRoot, "root")
        root.customData = {
            Blender: {
                generated: true
            }
        }

        const cube = new Xform(root, "Cube")
        cube.blenderObjectName = "Cube"

        const mesh = new Mesh(cube, "Mesh")
        mesh.blenderDataName = "Mesh"
        mesh.extent = [-1, -1, -1, 1, 1, 1]
        mesh.faceVertexCounts = [4, 4, 4, 4, 4, 4]
        mesh.faceVertexIndices = [0, 4, 6, 2, 3, 2, 6, 7, 7, 6, 4, 5, 5, 1, 3, 7, 1, 0, 2, 3, 5, 4, 0, 1]
        mesh.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]
        mesh.points = [1, 1, 1, 1, 1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, 1, -1, -1, -1]
        mesh.texCoords = [0.625, 0.5, 0.875, 0.5, 0.875, 0.75, 0.625, 0.75, 0.375, 0.75, 0.625, 0.75, 0.625, 1, 0.375, 1, 0.375, 0, 0.625, 0, 0.625, 0.25, 0.375, 0.25, 0.125, 0.5, 0.375, 0.5, 0.375, 0.75, 0.125, 0.75, 0.375, 0.5, 0.625, 0.5, 0.625, 0.75, 0.375, 0.75, 0.375, 0.25, 0.625, 0.25, 0.625, 0.5, 0.375, 0.5]
        mesh.subdivisionScheme = "none"

        const light = new DomeLight(root, "env_light")
        light.intensity = 1.0
        light.textureFile = "./textures/color_0C0C0C.exr"

        // serialize everything into crate.writer
        crate.serialize(pseudoRoot)

        // deserialize
        const stage = new Stage(Buffer.from(crate.writer.buffer))
        const pseudoRootIn = stage.getPrimAtPath("/")!.toJSON()

        // const filename = prefix.split('/').pop()
        // writeFileSync(`${filename}-generated.usdc`, Buffer.from(crate.writer.buffer))
        // writeFileSync(`${filename}-original.json`, stringify(orig, { indent: 4 }))
        // writeFileSync(`${filename}-generated.json`, stringify(pseudoRootIn, { indent: 4 }))

        compare(pseudoRootIn, orig)
    })
    it("cube-colored-faces.usdc", () => {
        const prefix = "spec/examples/cube-colored-faces"
        // read the original
        // const buffer = readFileSync(`${prefix}.usdc`)
        // const stageIn = new Stage(buffer)
        // const origPseudoRoot = stageIn.getPrimAtPath("/")!
        // const orig = origPseudoRoot.toJSON()
        // console.log(JSON.stringify(orig, undefined, 4))
        // writeFileSync(`${prefix}.json`, stringify(orig, {indent: 4}))

        // read an adjusted, good enough variant of the original's JSON
        const buffer = readFileSync(`${prefix}.json`)
        const orig = JSON.parse(buffer.toString())

        const crate = new Crate()

        const pseudoRoot = new PseudoRoot(crate)
        pseudoRoot.defaultPrim = "root"
        pseudoRoot.documentation = "Blender v5.0.1"

        const root = new Xform(pseudoRoot, "root")
        root.customData = {
            Blender: {
                generated: true
            }
        }

        const cube = new Xform(root, "Cube")
        const materials = new Scope(root, "_materials")
        const blue = makePrincipledBSDF(materials, "blue", [0, 0, 1])
        const gray = makePrincipledBSDF(materials, "gray", [0.8, 0.8, 0.8])
        const green = makePrincipledBSDF(materials, "green", [0, 1, 0])
        const red = makePrincipledBSDF(materials, "red", [1, 0, 0])

        cube.blenderObjectName = "Cube"

        const mesh = new Mesh(cube, "Cube")
        mesh.doubleSided = true
        mesh.extent = [-1, -1, -1, 1, 1, 1]
        mesh.faceVertexCounts = [4, 4, 4, 4, 4, 4]
        mesh.faceVertexIndices = [0, 4, 6, 2, 3, 2, 6, 7, 7, 6, 4, 5, 5, 1, 3, 7, 1, 0, 2, 3, 5, 4, 0, 1]
        mesh.materialBinding = {
            isExplicit: true,
            explicit: [red]
        }
        mesh.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]
        mesh.points = [1, 1, 1, 1, 1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, 1, -1, -1, -1]
        mesh.texCoords = [0.625, 0.5, 0.875, 0.5, 0.875, 0.75, 0.625, 0.75, 0.375, 0.75, 0.625, 0.75, 0.625, 1, 0.375, 1, 0.375, 0, 0.625, 0, 0.625, 0.25, 0.375, 0.25, 0.125, 0.5, 0.375, 0.5, 0.375, 0.75, 0.125, 0.75, 0.375, 0.5, 0.625, 0.5, 0.625, 0.75, 0.375, 0.75, 0.375, 0.25, 0.625, 0.25, 0.625, 0.5, 0.375, 0.5]
        mesh.subdivisionScheme = "none"
        mesh.familyType = "nonOverlapping"
        mesh.blenderDataName = "Cube"

        const blueFace = new GeomSubset(mesh, "blue")
        blueFace.elementType = "face"
        blueFace.familyName = "materialBind"
        blueFace.indices = [5]
        blueFace.materialBinding = { isExplicit: true, explicit: [blue] }

        const grayFace = new GeomSubset(mesh, "gray")
        grayFace.elementType = "face"
        grayFace.familyName = "materialBind"
        grayFace.indices = [1, 2, 3]
        grayFace.materialBinding = { isExplicit: true, explicit: [gray] }

        const greenFace = new GeomSubset(mesh, "green")
        greenFace.elementType = "face"
        greenFace.familyName = "materialBind"
        greenFace.indices = [4]
        greenFace.materialBinding = { isExplicit: true, explicit: [green] }

        const redFace = new GeomSubset(mesh, "red")
        redFace.elementType = "face"
        redFace.familyName = "materialBind"
        redFace.indices = [0]
        redFace.materialBinding = { isExplicit: true, explicit: [red] }

        const light = new DomeLight(root, "env_light")
        light.intensity = 1.0
        light.textureFile = "./textures/color_0C0C0C.exr"

        // serialize everything into crate.writer
        crate.serialize(pseudoRoot)
        // crate.print()

        // console.log("----------------")

        // deserialize 
        const stage = new Stage(Buffer.from(crate.writer.buffer))

        // stage._crate.print()

        const pseudoRootIn = stage.getPrimAtPath("/")!.toJSON()

        // const filename = prefix.split('/').pop()
        // writeFileSync(`${filename}-generated.usdc`, Buffer.from(crate.writer.buffer))
        // writeFileSync(`${filename}-original.json`, stringify(orig, { indent: 4 }))
        // writeFileSync(`${filename}-generated.json`, stringify(pseudoRootIn, { indent: 4 }))

        compare(pseudoRootIn, orig)
    })
    it("armature.usdc", () => {
        const prefix = "spec/examples/armature"
        // read the original
        // const buffer = readFileSync(`${prefix}.usdc`)
        // const stageIn = new Stage(buffer)
        // const origPseudoRoot = stageIn.getPrimAtPath("/")!
        // const orig = origPseudoRoot.toJSON()
        // console.log(JSON.stringify(orig, undefined, 4))
        // writeFileSync(`${prefix}.json`, stringify(orig, {indent: 4}))

        // read an adjusted, good enough variant of the original's JSON
        const buffer = readFileSync(`${prefix}.json`)
        const orig = JSON.parse(buffer.toString())

        const crate = new Crate()

        const pseudoRoot = new PseudoRoot(crate)
        pseudoRoot.defaultPrim = "root"
        pseudoRoot.documentation = "Blender v5.0.1"

        const root = new Xform(pseudoRoot, "root")
        root.customData = {
            Blender: {
                generated: true
            }
        }

        const skelRoot = new SkelRoot(root, "Armature")
        skelRoot.blenderObjectName = "Armature"
        skelRoot.rotateXYZ = [0, 0, 0]
        skelRoot.scale = [1, 1, 1]
        skelRoot.translate = [0, 0, -1]
        skelRoot.xformOrder = ["xformOp:translate", "xformOp:rotateXYZ", "xformOp:scale"]

        const skeleton = new Skeleton(skelRoot, "Armature")
        skeleton.bindTransforms = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 1, 1]
        skeleton.joints = ["Bone", "Bone/Bone_001"]
        skeleton.blenderBoneLength = [1, 1]
        skeleton.restTransforms = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1]

        const cameraParent = new Xform(root, "Camera")
        cameraParent.blenderObjectName = "Camera"
        cameraParent.rotateXYZ = [63.559295654296875, 2.2983238068263745e-7, 46.69194412231445]
        cameraParent.scale = [1, 1, 1]
        cameraParent.translate = [7.358891487121582, -6.925790786743164, 4.958309173583984]
        cameraParent.xformOrder = ["xformOp:translate", "xformOp:rotateXYZ", "xformOp:scale"]

        const camera = new Camera(cameraParent, "Camera")
        camera.clippingRange = [0.1, 100]
        camera.focalLength = 0.5
        camera.horizontalAperture = 0.36
        camera.projection = "perspective"
        camera.blenderDataName = "Camera"
        camera.verticalAperture = 0.2025

        const lightParent = new Xform(root, "Light")
        lightParent.blenderObjectName = "Light"
        lightParent.rotateXYZ = [37.26105, 3.1637092, 106.936328]
        lightParent.scale = [1, 0.99999996, 1]
        lightParent.translate = [4.076245307922363, 1.0054539442062379, 5.903861999511719]
        lightParent.xformOrder = ["xformOp:translate", "xformOp:rotateXYZ", "xformOp:scale"]

        const light = new SphereLight(lightParent, "Light")
        light.extent = [-0.10000000149011612, -0.10000000149011612, -0.10000000149011612, 0.10000000149011612, 0.10000000149011612, 0.10000000149011612]
        light.enableColorTemperature = true
        light.intensity = 318.30987548828125
        light.normalize = true
        light.radius = 0.10000000149011612
        light.blenderDataName = "Light"

        const materials = new Scope(root, "_materials")
        const gray = makePrincipledBSDF(materials, "Material", [0.8, 0.8, 0.8])

        const domeLight = new DomeLight(root, "env_light")
        domeLight.intensity = 1.0
        domeLight.textureFile = "./textures/color_0C0C0C.exr"

        const meshParent = new Xform(skelRoot, "Cube")
        meshParent.blenderObjectName = "Cube"
        meshParent.rotateXYZ = [0, 0, 0]
        meshParent.scale = [1, 1, 1]
        meshParent.translate = [0, 0, 1]
        meshParent.xformOrder = ["xformOp:translate", "xformOp:rotateXYZ", "xformOp:scale"]

        const mesh = new Mesh(meshParent, "Cube")
        mesh.doubleSided = true
        mesh.extent = [-1, -1, -1, 1, 1, 1]
        mesh.faceVertexCounts = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
        mesh.faceVertexIndices = [0, 4, 6, 2, 10, 2, 6, 9, 9, 6, 4, 11, 5, 1, 3, 7, 8, 0, 2, 10, 11, 4, 0, 8, 5, 11, 8, 1, 1, 8, 10, 3, 7, 9, 11, 5, 3, 10, 9, 7]
        mesh.materialBinding = {
            isExplicit: true,
            explicit: [gray]
        }
        mesh.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0]
        mesh.points = [1, 1, 1, 1, 1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, 1, -1, -1, -1, 1, 1, 0, -1, -1, 0, 1, -1, 0, -1, 1, 0]

        mesh.geomBindTransform = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1]
        mesh.jointIndices = { elementSize: 2, indices: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1] }
        mesh.jointWeights = { elementSize: 2, indices: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0.4996339976787567, 0.5003660321235657, 0.5081230401992798, 0.4918769598007202, 0.5216529965400696, 0.4783470034599304, 0.4856490194797516, 0.514350950717926] }

        mesh.texCoords = [0.625, 0.5, 0.875, 0.5, 0.875, 0.75, 0.625, 0.75, 0.5, 0.75, 0.625, 0.75, 0.625, 1, 0.5, 1, 0.5, 0, 0.625, 0, 0.625, 0.25, 0.5, 0.25, 0.125, 0.5, 0.375, 0.5, 0.375, 0.75, 0.125, 0.75, 0.5, 0.5, 0.625, 0.5, 0.625, 0.75, 0.5, 0.75, 0.5, 0.25, 0.625, 0.25, 0.625, 0.5, 0.5, 0.5, 0.375, 0.25, 0.5, 0.25, 0.5, 0.5, 0.375, 0.5, 0.375, 0.5, 0.5, 0.5, 0.5, 0.75, 0.375, 0.75, 0.375, 0, 0.5, 0, 0.5, 0.25, 0.375, 0.25, 0.375, 0.75, 0.5, 0.75, 0.5, 1, 0.375, 1]
        mesh.skeleton = skeleton

        mesh.subdivisionScheme = "none"
        mesh.blenderDataName = "Cube"

        // serialize everything into crate.writer
        crate.serialize(pseudoRoot)
        // crate.print()

        // console.log("----------------")

        // deserialize 
        const stage = new Stage(Buffer.from(crate.writer.buffer))

        // stage._crate.print()

        const pseudoRootIn = stage.getPrimAtPath("/")!.toJSON()

        // const filename = prefix.split('/').pop()
        // writeFileSync(`${filename}-generated.usdc`, Buffer.from(crate.writer.buffer))
        // writeFileSync(`${filename}-original.json`, stringify(orig, { indent: 4 }))
        // writeFileSync(`${filename}-generated.json`, stringify(pseudoRootIn, { indent: 4 }))

        compare(pseudoRootIn, orig)
    })
    it("cube-textured.usdc", () => {
        const prefix = "spec/examples/cube-textured"
        // read the original
        // const buffer = readFileSync(`${prefix}.usdc`)
        // const stageIn = new Stage(buffer)
        // const origPseudoRoot = stageIn.getPrimAtPath("/")!
        // const orig = origPseudoRoot.toJSON()
        // console.log(JSON.stringify(orig, undefined, 4))
        // writeFileSync(`${prefix}.json`, stringify(orig, {indent: 4}))

        // read an adjusted, good enough variant of the original's JSON
        const buffer = readFileSync(`${prefix}.json`)
        const orig = JSON.parse(buffer.toString())

        const crate = new Crate()

        const pseudoRoot = new PseudoRoot(crate)
        pseudoRoot.defaultPrim = "root"
        pseudoRoot.documentation = "Blender v5.1.0"

        const root = new Xform(pseudoRoot, "root")
        root.customData = {
            Blender: {
                generated: true
            }
        }

        const meshParent = new Xform(root, "Cube")
        meshParent.blenderObjectName = "Cube"

        const mesh = new Mesh(meshParent, "Cube")

        const materials = new Scope(root, "_materials")

        // material definition with three nodes, connected as follows:
        //
        // Material        principledBSDF          imageTexture    uvmap
        // outputs:surface outputs:surface
        //                 inputs:diffuseColor     outputs:rgb
        //                                         inputs:st       outputs:result
        const material = new Material(materials, "Material")
        material.blenderDataName = "Material"

        const uvmap = new UVMap(material, "uvmap")
        uvmap.infoId = "UsdPrimvarReader_float2"
        uvmap.inputsVarname = "st"

        const imageTexture = new ImageTexture(material, "Image_Texture")
        imageTexture.infoId = "UsdUVTexture"
        imageTexture.file = "./textures/cubetexture.png"
        imageTexture.sourceColorSpace = "sRGB"
        imageTexture.uvCoords = uvmap.outputsResult
        imageTexture.wrapS = "repeat"
        imageTexture.wrapT = "repeat"

        const principledBSDF = new PrincipledBSDF(material, "Principled_BSDF")
        principledBSDF.infoId = "UsdPreviewSurface"
        principledBSDF.clearcoat = 0
        principledBSDF.clearcoatRoughness = 0.03
        principledBSDF.diffuseColor = imageTexture.outputsRGB
        principledBSDF.ior = 1.5
        principledBSDF.metallic = 0
        principledBSDF.opacity = 1
        principledBSDF.roughness = 0.5
        principledBSDF.specular = 0.5

        material.surface = principledBSDF.outputsSurface

        //
        // MESH
        //
        mesh.doubleSided = true
        mesh.extent = [-1, -1, -1, 1, 1, 1]
        mesh.faceVertexCounts = [4, 4, 4, 4, 4, 4]
        mesh.faceVertexIndices = [0, 4, 6, 2, 3, 2, 6, 7, 7, 6, 4, 5, 5, 1, 3, 7, 1, 0, 2, 3, 5, 4, 0, 1]
        mesh.materialBinding = {
            isExplicit: true,
            explicit: [material]
        }
        mesh.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]
        mesh.points = [1, 1, 1, 1, 1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, 1, -1, -1, -1]

        mesh.texCoords = [0.7864828109741211, 0.4631108343601227, 0.4918825626373291, 0.4691932797431946, 0.7865025401115417, 0.9903982281684875, 0.48568177223205566, 0.9935183525085449, 0.9886826276779175, 0.4633080065250397, 0.7865025401115417, 0.2423480898141861, 0.00009958772716345266, 0.4661126136779785, 0.48337018489837646, 0.23920826613903046, 0.9917830228805542, 0.9935380220413208, 0.7865025401115417, 0.9999004602432251, 0.7865025401115417, 0.00009955812129192054, 0.4887821674346924, 0.9999595880508423, 0.4864705801010132, -0.009201617911458015, 0.0006620592903345823, 1.0013625621795654]
        mesh.texIndices = [0, 4, 8, 2, 3, 2, 9, 11, 12, 10, 5, 7, 6, 1, 3, 13, 1, 0, 2, 3, 7, 5, 0, 1]

        mesh.subdivisionScheme = "none"
        mesh.blenderDataName = "Cube"

        const domeLight = new DomeLight(root, "env_light")
        domeLight.intensity = 1
        domeLight.textureFile = "./textures/color_0C0C0C.exr"

        // serialize everything into crate.writer
        crate.serialize(pseudoRoot)
        // crate.print()

        // console.log("----------------")

        // deserialize 
        const stage = new Stage(Buffer.from(crate.writer.buffer))

        // stage._crate.print()

        const pseudoRootIn = stage.getPrimAtPath("/")!.toJSON()

        // const filename = prefix.split('/').pop()
        // writeFileSync(`${filename}-generated.usdc`, Buffer.from(crate.writer.buffer))
        // writeFileSync(`${filename}-original.json`, stringify(orig, { indent: 4 }))
        // writeFileSync(`${filename}-generated.json`, stringify(pseudoRootIn, { indent: 4 }))

        compare(pseudoRootIn, orig)
    })
    it("cube-blendshape.usdc", () => {
        const prefix = "spec/examples/cube-blendshape"
        // read the original
        // const buffer = readFileSync(`${prefix}.usdc`)
        // const stageIn = new Stage(buffer)
        // const origPseudoRoot = stageIn.getPrimAtPath("/")!
        // const orig = origPseudoRoot.toJSON()
        // console.log(JSON.stringify(orig, undefined, 4))
        // writeFileSync(`${prefix}.json`, stringify(orig, {indent: 4}))

        // read an adjusted, good enough variant of the original's JSON
        const buffer = readFileSync(`${prefix}.json`)
        const orig = JSON.parse(buffer.toString())

        const crate = new Crate()

        const pseudoRoot = new PseudoRoot(crate)
        pseudoRoot.documentation = "Blender v5.1.0"
        pseudoRoot.defaultPrim = "root"

        const root = new Xform(pseudoRoot, "root")
        root.customData = {
            Blender: {
                generated: true
            }
        }

        const cube = new SkelRoot(root, "Cube")
        cube.blenderObjectName = "Cube"

        const materials = new Scope(root, "_materials")
        // const material = new Material(materials, "Material")
        const material = new Material(materials, "Material")

        const shader = new PrincipledBSDF(material, "Principled_BSDF")
        shader.infoId = "UsdPreviewSurface"
        shader.clearcoat = 0
        shader.clearcoatRoughness = 0.03
        shader.diffuseColor = [0.8, 0.8, 0.8]
        shader.ior = 1.5
        shader.metallic = 0
        shader.opacity = 1
        shader.roughness = 0.5
        shader.specular = 0.5

        material.surface = shader.outputsSurface
        material.blenderDataName = "Material"

        const mesh = new Mesh(cube, "Cube")
        const skeleton = new Skeleton(cube, "Skel")

        mesh.doubleSided = true
        mesh.extent = [-1, -1, -1, 1, 1, 1]
        mesh.faceVertexCounts = [4, 4, 4, 4, 4, 4]
        mesh.faceVertexIndices = [0, 4, 6, 2, 3, 2, 6, 7, 7, 6, 4, 5, 5, 1, 3, 7, 1, 0, 2, 3, 5, 4, 0, 1]
        mesh.materialBinding = {
            isExplicit: true,
            explicit: [material]
        }
        mesh.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]
        mesh.points = [1, 1, 1, 1, 1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, 1, -1, -1, -1]

        // blender exports this but it's not defined in the OpenUSD schemas nor can google find it.
        // and blender usd import also works without it.
        new Attribute(mesh, "primvars:Group", node => {
            node.setToken("typeName", "float[]")
            node.setToken("interpolation", "vertex")
            node.setFloatArray("default", [0, 0, 0, 0, 0, 0, 0, 0])
        })

        mesh.jointIndices = {
            elementSize: 1,
            indices: [0, 0, 0, 0, 0, 0, 0, 0]
        }
        mesh.jointWeights = {
            elementSize: 1,
            indices: [1, 1, 1, 1, 1, 1, 1, 1]
        }
        mesh.texCoords = [0.625, 0.5, 0.375, 0.5, 0.625, 0.75, 0.375, 0.75, 0.875, 0.5, 0.625, 0.25, 0.125, 0.5, 0.375, 0.25, 0.875, 0.75, 0.625, 1, 0.625, 0, 0.375, 1, 0.375, 0, 0.125, 0.75]
        mesh.texIndices = [0, 4, 8, 2, 3, 2, 9, 11, 12, 10, 5, 7, 6, 1, 3, 13, 1, 0, 2, 3, 7, 5, 0, 1]

        mesh.blendShapes = ["Key_1", "Key_2"]
        mesh.skeleton = { prepend: [skeleton] }

        mesh.subdivisionScheme = "none"
        mesh.blenderDataName = "Cube"

        const key1 = new BlendShape(mesh, "Key_1")
        key1.offsets = [-1.1725950241088867, -0.8274050354957581, 0, 0, 0, 0, -0.8274050354957581, 1.1725950241088867, 0, 0, 0, 0, 0.8274050354957581, -1.1725950241088867, 0, 0, 0, 0, 1.1725950241088867, 0.8274050354957581, 0, 0, 0, 0]
        key1.pointIndices = [0, 1, 2, 3, 4, 5, 6, 7]

        const key2 = new BlendShape(mesh, "Key_2")
        key2.offsets = [0, 0, 0, -1, -1, 0, 0, 0, 0, -1, 1, 0, 0, 0, 0, 1, -1, 0, 0, 0, 0, 1, 1, 0]
        key2.pointIndices = [0, 1, 2, 3, 4, 5, 6, 7]

        mesh.blendShapeTargets = [key1, key2]

        skeleton.bindTransforms = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
        skeleton.joints = ["joint1"]
        skeleton.restTransforms = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

        const anim = new SkelAnimation(skeleton, "Anim")
        anim.blendShapeWeights = []
        anim.blendShapes = ["Key_1", "Key_2"]

        skeleton.animationSource = { prepend: [anim] }

        const light = new DomeLight(root, "env_light")
        light.intensity = 1.0
        light.textureFile = "./textures/color_0C0C0C.exr"

        // serialize everything into crate.writer
        crate.serialize(pseudoRoot)

        // deserialize
        const stage = new Stage(Buffer.from(crate.writer.buffer))
        const pseudoRootIn = stage.getPrimAtPath("/")!.toJSON()

        // const filename = prefix.split('/').pop()
        // writeFileSync(`${filename}-generated.usdc`, Buffer.from(crate.writer.buffer))
        // writeFileSync(`${filename}-original.json`, stringify(orig, { indent: 4 }))
        // writeFileSync(`${filename}-generated.json`, stringify(pseudoRootIn, { indent: 4 }))

        compare(pseudoRootIn, orig)
    })
    // https://openusd.org/dev/user_guides/time_and_animated_values.html
    // USD only supports samples, not curves for animations.
    // Blender can convert the sample to curces:
    // go to Graph Editor > Key > Density > Decimate (Ratio)
    // and move the mouse to adjust the precision
    it("cube-animation.usdc", () => {
        const prefix = "spec/examples/cube-animation"
        // read the original
        // const buffer = readFileSync(`${prefix}.usdc`)
        // const stageIn = new Stage(buffer)
        // const origPseudoRoot = stageIn.getPrimAtPath("/")!
        // const orig = origPseudoRoot.toJSON()
        // console.log(JSON.stringify(orig, undefined, 4))
        // writeFileSync(`x.json`, stringify(orig, { indent: 4 }))

        // read an adjusted, good enough variant of the original's JSON
        const buffer = readFileSync(`${prefix}.json`)
        const orig = JSON.parse(buffer.toString())

        const crate = new Crate()

        const pseudoRoot = new PseudoRoot(crate)
        pseudoRoot.defaultPrim = "root"
        pseudoRoot.documentation = "Blender v5.1.0"
        pseudoRoot.timeCodesPerSecond = 24
        pseudoRoot.startTimeCode = 1
        pseudoRoot.endTimeCode = 100

        const root = new Xform(pseudoRoot, "root")
        root.customData = {
            Blender: {
                generated: true
            }
        }

        const skelRoot = new SkelRoot(root, "Empty")
        skelRoot.blenderObjectName = "Empty"

        const mesh = new Xform(skelRoot, "Mesh")
        mesh.blenderObjectName = "Mesh"
        const meshData = new Mesh(mesh, "MeshData")

        const skelForm = new Xform(skelRoot, "Skel")
        skelForm.blenderObjectName = "Skel"
        skelForm.rotateXYZ = {
            timeIndex: [1],
            samples: [[0, 0, 0]]
        }
        skelForm.scale = {
            timeIndex: [1],
            samples: [[1, 1, 1]]
        }
        skelForm.translate = {
            timeIndex: [1],
            samples: [[0, 0, 0]]
        }
        skelForm.xformOrder = ["xformOp:translate", "xformOp:rotateXYZ", "xformOp:scale"]

        const skeleton = new Skeleton(skelForm, "Skel")
        skeleton.bindTransforms = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1]
        skeleton.joints = ["joint1", "joint1/joint2"]
        skeleton.blenderBoneLength = [1, 1]
        skeleton.restTransforms = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1]

        const anim = new SkelAnimation(skeleton, "SkelAction")
        // time indices for which we animate
        const timeIndex = [1, 2, 3]
        // animate blendshapes
        anim.blendShapeWeights = {
            timeIndex,
            samples: [
                [0, 0],
                [0.0010348177747800946, 0.0000016999719036903116],
                [0.0040821777656674385, 0.000013599775229522493]
            ]
        }
        anim.blendShapes = ["Key_1", "Key_2"]

        // animate skeleton
        anim.joints = ["joint1", "joint1/joint2"]
        anim.rotations = {
            timeIndex,
            samples: [
                [0, 0, 0, 1,
                    0, 0, 0, 1],
                [0.00025706528685986996, 0, 0, 0.9999999403953552,
                    0, 0, -0.0008718090248294175, 0.9999996423721313],
                [0.001020141295157373, 0, 0, 0.999999463558197,
                    7.827971978476456e-16, 2.273723337430436e-13, -0.0034427784848958254, 0.9999940991401672]
            ]
        }
        anim.scales = [1, 1, 1, 1, 1, 1]
        anim.translations = {
            timeIndex,
            samples: [
                [0, 0, 0,
                    0, 1, 0],
                [-0.0012324796989560127, 0.0012324796989560127, 0,
                    1.1641532182693481e-10, 1, 6.87805368215777e-12],
                [-0.004861919675022364, 0.004861919675022364, 0,
                    0, 0.9999999403953552, 1.673470251262188e-10]
            ]
        }
        skeleton.animationSource = {
            isExplicit: true,
            explicit: [anim]
        }

        const materials = new Scope(root, "_materials")
        materials.blenderObjectName = "_materials"

        const material = new Material(materials, "Material")

        const principledBSDF = new PrincipledBSDF(material, "Principled_BSDF")
        principledBSDF.infoId = "UsdPreviewSurface"
        principledBSDF.clearcoat = 0
        principledBSDF.clearcoatRoughness = 0.03
        principledBSDF.diffuseColor = [0.8, 0.8, 0.8]
        principledBSDF.ior = 1.5
        principledBSDF.metallic = 0
        principledBSDF.opacity = 1
        principledBSDF.roughness = 0.5
        principledBSDF.specular = 0.5

        material.surface = principledBSDF.outputsSurface
        material.blenderDataName = "Material"

        //
        // MESH
        //
        meshData.doubleSided = true
        meshData.extent = [-1, -1, -1, 1, 1, 1]
        meshData.faceVertexCounts = [4, 4, 4, 4, 4, 4]
        meshData.faceVertexIndices = [0, 4, 6, 2, 3, 2, 6, 7, 7, 6, 4, 5, 5, 1, 3, 7, 1, 0, 2, 3, 5, 4, 0, 1]
        meshData.materialBinding = {
            isExplicit: true,
            explicit: [material]
        }
        meshData.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]
        meshData.points = [1, 1, 1, 1, 1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, 1, -1, -1, -1]

        // blender exports this but it's not defined in the OpenUSD schemas nor can google find it.
        // and blender usd import also works without it.
        new Attribute(meshData, "primvars:Group", node => {
            node.setToken("typeName", "float[]")
            node.setToken("interpolation", "vertex")
            node.setFloatArray("default", [0, 0, 0, 0, 0, 0, 0, 0])
        })

        meshData.geomBindTransform = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
        meshData.jointIndices = {
            elementSize: 1,
            indices: [0, 0, 0, 0, 0, 0, 0, 0]
        }
        meshData.jointWeights = {
            elementSize: 1,
            indices: [1, 1, 1, 1, 1, 1, 1, 1]
        }
        meshData.texCoords = [0.625, 0.5, 0.375, 0.5, 0.625, 0.75, 0.375, 0.75, 0.875, 0.5, 0.625, 0.25, 0.125, 0.5, 0.375, 0.25, 0.875, 0.75, 0.625, 1, 0.625, 0, 0.375, 1, 0.375, 0, 0.125, 0.75]
        
        // it does not make sense to animate texIndices like this
        //     int[] primvars:st:indices.timeSamples = {
        //         1: [0, 4, 8, 2, 3, 2, 9, 11, 12, 10, 5, 7, 6, 1, 3, 13, 1, 0, 2, 3, 7, 5, 0, 1],
        //     }
        // hence i assume Blender got this wron and i'm not creating an attribute for it yet...
        // meshData.texIndices = [0, 4, 8, 2, 3, 2, 9, 11, 12, 10, 5, 7, 6, 1, 3, 13, 1, 0, 2, 3, 7, 5, 0, 1]
        new Attribute(meshData, "primvars:st:indices", (node) => {
            node.setToken("typeName", "int[]")
            node.setTimeSamples("timeSamples", {
                timeIndex: [1],
                sampleType: CrateDataType.Int,
                samples: [
                    [0, 4, 8, 2, 3, 2, 9, 11, 12, 10, 5, 7, 6, 1, 3, 13, 1, 0, 2, 3, 7, 5, 0, 1]
                ]
            })
        })

        meshData.blendShapes = ["Key_1", "Key_2"]
        meshData.skeleton = skeleton
        meshData.subdivisionScheme = "none"
        meshData.blenderDataName = "MeshData"

        const key1 = new BlendShape(meshData, "Key_1")
        key1.offsets = [-1.1725950241088867, -0.8274050354957581, 0, 0, 0, 0, -0.8274050354957581, 1.1725950241088867, 0, 0, 0, 0, 0.8274050354957581, -1.1725950241088867, 0, 0, 0, 0, 1.1725950241088867, 0.8274050354957581, 0, 0, 0, 0]
        key1.pointIndices = [0, 1, 2, 3, 4, 5, 6, 7]

        const key2 = new BlendShape(meshData, "Key_2")
        key2.offsets = [0, 0, 0, -1, -1, 0, 0, 0, 0, -1, 1, 0, 0, 0, 0, 1, -1, 0, 0, 0, 0, 1, 1, 0]
        key2.pointIndices = [0, 1, 2, 3, 4, 5, 6, 7]

        meshData.blendShapeTargets = [key1, key2]

        const domeLight = new DomeLight(root, "env_light")
        domeLight.textureFile = "./textures/color_0C0C0C.exr"
        domeLight.rotateXYZ = [0, 0, 0]
        domeLight.xformOrder = ["xformOp:rotateXYZ"]

        // serialize everything into crate.writer
        crate.serialize(pseudoRoot)
        // crate.print()

        // console.log("----------------")

        // deserialize 
        const stage = new Stage(Buffer.from(crate.writer.buffer))

        // stage._crate.print()

        const pseudoRootIn = stage.getPrimAtPath("/")!.toJSON()

        // const filename = prefix.split('/').pop()
        // writeFileSync(`${filename}-generated.usdc`, Buffer.from(crate.writer.buffer))
        // writeFileSync(`${filename}-original.json`, stringify(orig, { indent: 4 }))
        // writeFileSync(`${filename}-generated.json`, stringify(pseudoRootIn, { indent: 4 }))

        compare(pseudoRootIn, orig)
    })
})

// this is the thing i still need to write
function compare(lhs: any, rhs: any, path: string = "") {
    // console.log(`compare ${ lhs }: ${ typeof lhs }, ${ rhs }: ${ typeof rhs }, ${ path }`)
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

function makePrincipledBSDF(scope: Scope, name: string, diffuseColor: number[]) {
    const material = new Material(scope, name)

    const shader = new PrincipledBSDF(material, "Principled_BSDF")
    shader.infoId = "UsdPreviewSurface"
    shader.clearcoat = 0
    shader.clearcoatRoughness = 0.03
    shader.diffuseColor = diffuseColor
    shader.ior = 1.5
    shader.metallic = 0
    shader.opacity = 1
    shader.roughness = 0.5
    shader.specular = 0.5

    material.surface = shader.outputsSurface
    material.blenderDataName = name

    return material
}