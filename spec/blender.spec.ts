import { expect } from "chai"
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
import { Variability } from "../src/crate/Variability"
import { stringify } from "./stringify"
import { IntArrayAttr } from "../src/nodes/attributes/IntArrayAttr"
import { VariabilityAttr } from "../src/nodes/attributes/VariabilityAttr"
import { Relationship } from "../src/nodes/attributes/Relationship"
import { makePrincipledBSDF } from "../src/nodes/shader/blender/PrincipledBSDF"
import { Crate } from "../src/crate/Crate"
import { Attribute } from "../src/nodes/attributes/Attribute"
import { Material } from "../src/nodes/shader/Material"
import { Shader } from "../src/nodes/shader/Shader"
import { TokenAttr } from "../src/nodes/attributes/TokenAttr"
import { FloatAttr } from "../src/nodes/attributes/FloatAttr"
import { Color3fAttr } from "../src/nodes/attributes/Color3fAttr"
import { AssetPathAttr } from "../src/nodes/attributes/AssetPathAttr"
import { StringAttr } from "../src/nodes/attributes/StringAttr"
import { CrateDataType } from "../src/crate/CrateDataType"

/**
 * re-create files generated with blender 5.0
 * features covered are those needed by makehuman.js
 * 
 * during development i compared json files with these commands:
 *   diff -y --color=always -W 180 spec/examples/cube-colored-faces.json constructed.json | less -r
 *   diff -u --color=always -W 180 spec/examples/cube-colored-faces.json constructed.json | less -r
 */
describe("re-create blender 5.0 files", () => {
    it("cube-flat-faces.usdc", () => {
        const prefix = "spec/examples/cube-flat-faces"
        // read the original
        // const buffer = readFileSync("`${prefix}.usdc`")
        // const stageIn = new UsdStage(buffer)
        // const origPseudoRoot = stageIn.getPrimAtPath("/")!
        // const orig = origPseudoRoot.toJSON()
        // console.log(JSON.stringify(orig, undefined, 4))

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

        const filename = prefix.split('/').pop()
        writeFileSync(`${filename}-generated.usdc`, Buffer.from(crate.writer.buffer))
        writeFileSync(`${filename}-original.json`, stringify(orig, { indent: 4 }))
        writeFileSync(`${filename}-generated.json`, stringify(pseudoRootIn, { indent: 4 }))

        compare(pseudoRootIn, orig)
    })
    it("cube-colored-faces.usdc", () => {
        const prefix = "spec/examples/cube-colored-faces"
        // read the original
        // const buffer = readFileSync(`${prefix}.usdc`)
        // const stageIn = new UsdStage(buffer)
        // const origPseudoRoot = stageIn.getPrimAtPath("/")!
        // const orig = origPseudoRoot.toJSON()
        // console.log(JSON.stringify(orig, undefined, 4))
        // // writeFileSync(`${prefix}.json`, JSON.stringify(orig, undefined, 4))

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
        new VariabilityAttr(blueFace, "elementType", Variability.Uniform, "face")
        new VariabilityAttr(blueFace, "familyName", Variability.Uniform, "materialBind")
        new IntArrayAttr(blueFace, "indices", [5])
        new Relationship(blueFace, "material:binding", { isExplicit: true, explicit: [blue] })

        const grayFace = new GeomSubset(mesh, "gray")
        new VariabilityAttr(grayFace, "elementType", Variability.Uniform, "face")
        new VariabilityAttr(grayFace, "familyName", Variability.Uniform, "materialBind")
        new IntArrayAttr(grayFace, "indices", [1, 2, 3])
        new Relationship(grayFace, "material:binding", { isExplicit: true, explicit: [gray] })

        const greenFace = new GeomSubset(mesh, "green")
        new VariabilityAttr(greenFace, "elementType", Variability.Uniform, "face")
        new VariabilityAttr(greenFace, "familyName", Variability.Uniform, "materialBind")
        new IntArrayAttr(greenFace, "indices", [4])
        new Relationship(greenFace, "material:binding", { isExplicit: true, explicit: [green] })

        const redFace = new GeomSubset(mesh, "red")
        new VariabilityAttr(redFace, "elementType", Variability.Uniform, "face")
        new VariabilityAttr(redFace, "familyName", Variability.Uniform, "materialBind")
        new IntArrayAttr(redFace, "indices", [0])
        new Relationship(redFace, "material:binding", { isExplicit: true, explicit: [red] })

        // _materials

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

        const filename = prefix.split('/').pop()
        writeFileSync(`${filename}-generated.usdc`, Buffer.from(crate.writer.buffer))
        writeFileSync(`${filename}-original.json`, stringify(orig, { indent: 4 }))
        writeFileSync(`${filename}-generated.json`, stringify(pseudoRootIn, { indent: 4 }))

        compare(pseudoRootIn, orig)
    })
    it("armature.usdc", () => {
        const prefix = "spec/examples/armature"
        // read the original
        // const buffer = readFileSync(`${prefix}.usdc`)
        // const stageIn = new UsdStage(buffer)
        // const origPseudoRoot = stageIn.getPrimAtPath("/")!
        // const orig = origPseudoRoot.toJSON()
        // // console.log(JSON.stringify(orig, undefined, 4))
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

        const filename = prefix.split('/').pop()
        writeFileSync(`${filename}-generated.usdc`, Buffer.from(crate.writer.buffer))
        writeFileSync(`${filename}-original.json`, stringify(orig, { indent: 4 }))
        writeFileSync(`${filename}-generated.json`, stringify(pseudoRootIn, { indent: 4 }))

        compare(pseudoRootIn, orig)
    })
    it("cube-textured.usdc", () => {
        const prefix = "spec/examples/cube-textured"
        // read the original
        const buffer = readFileSync(`${prefix}.usdc`)
        const stageIn = new Stage(buffer)
        const origPseudoRoot = stageIn.getPrimAtPath("/")!
        const orig = origPseudoRoot.toJSON()
        // console.log(JSON.stringify(orig, undefined, 4))
        // writeFileSync(`${prefix}.json`, stringify(orig, {indent: 4}))
       
        // read an adjusted, good enough variant of the original's JSON
        // const buffer = readFileSync(`${prefix}.json`)
        // const orig = JSON.parse(buffer.toString())

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

        const material = new Material(materials, "Material")
        new Attribute(material, "outputs:surface", (node) => {
            node.setToken("typeName", "token")
            node.setPathListOp("connectionPaths", {
                isExplicit: true,
                explicit: [surface]
            })
        })
        material.blenderDataName = "Material"

        const imageTexture = new Shader(material, "Image_Texture")
        // uniform token info:id = "UsdUVTexture"
        new TokenAttr(imageTexture, "info:id", Variability.Uniform, "UsdUVTexture")

        // FIXME: attributes after this one are decoded wrong when reading the original
        // write regression test for reader!!!

        // asset inputs:file = @./textures/cubetexture.png@
        new FloatAttr(imageTexture, "inputs:file", 1.5)
        // token inputs:sourceColorSpace = "sRGB"
        new Attribute(imageTexture, "inputs:sourceColorSpace", (node) => {
            node.setToken("typeName", "float2")
            node.setPathListOp("connectionPaths", {
                isExplicit: true,
                explicit: [uvmapOutputsRGB]
            })
        })
        // texCoord2f inputs:st.connect = </root/_materials/Material/uvmap.outputs:result>
        new TokenAttr(imageTexture, "inputs:st", undefined, "repeat")
        // token inputs:wrapS = "repeat"
        new Attribute(imageTexture, "inputs:wrapS", (node) => {
            node.setToken("typeName", "float2")
            // TODO: value
        })
        // token inputs:wrapT = "repeat"
        new Attribute(imageTexture, "inputs:wrapT", (node) => {
            node.setToken("typeName", "float3")
            // TODO: value
        })
        const imageTextureOutputsRGB = new AssetPathAttr(imageTexture, "outputs:rgb", "./textures/cubetexture.png")

        const shader = new Shader(material, "Principled_BSDF")
        new TokenAttr(shader, "info:id", Variability.Uniform, "UsdPreviewSurface")
        new FloatAttr(shader, "inputs:clearcoat", 0)
        new FloatAttr(shader, "inputs:clearcoatRoughness", 0.029999999329447746)

        // new Color3fAttr(shader, "inputs:diffuseColor", [1,1,1]) // float 1
        new FloatAttr(shader, "inputs:diffuseColor", 1)

        new FloatAttr(shader, "inputs:ior", 1)
        new FloatAttr(shader, "inputs:metallic", 0.5)

        // new FloatAttr(shader, "inputs:opacity", 1) // token: sRGB
        new TokenAttr(shader, "inputs:opacity", undefined, "sRGB") // token: sRGB

        new FloatAttr(shader, "inputs:roughness", 0.5)

        // new FloatAttr(shader, "inputs:specular", 0.5) // string st
        new StringAttr(shader, "inputs:specular", "st")

        const surface = new TokenAttr(shader, "outputs:surface")

        const uvmap = new Shader(material, "uvmap")
        // uniform token info:id = "UsdPrimvarReader_float2"
        new TokenAttr(uvmap, "info:id", Variability.Uniform, "UsdPrimvarReader_float2")
        // string inputs:varname = "st"
        new Attribute(uvmap, "inputs:varname", node => {
            node.setToken("typeName", "normal3f[]")
            node.setVec3fArray("default", [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0])
            node.setToken("interpolation", "faceVarying")
        })
        // float2 outputs:result
        const uvmapOutputsRGB = new TokenAttr(uvmap, "outputs:result", undefined, "repeat")

        // makePrincipledBSDF(material, "Principled_BSDF", [1,2,3])

        mesh.doubleSided = true
        mesh.extent = [-1, -1, -1, 1, 1, 1]
        mesh.faceVertexCounts = [4, 4, 4, 4, 4, 4]
        mesh.faceVertexIndices = [0, 4, 6, 2, 3, 2, 6, 7, 7, 6, 4, 5, 5, 1, 3, 7, 1, 0, 2, 3, 5, 4, 0, 1]
        mesh.materialBinding = "./textures/color_0C0C0C.exr"
        // mesh.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0]
        new Attribute(mesh, "normals", (node) => {
            node.setToken("typeName", "color3f")
            node.setPathListOp("connectionPaths", {
                isExplicit: true,
                explicit: [imageTextureOutputsRGB] // /root/_materials/Material/Image_...
            })
        })
        mesh.points = [1, 1, 1, 1, 1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, 1, -1, -1, -1]

        mesh.texCoords = [0.7864828109741211, 0.4631108343601227, 0.4918825626373291, 0.4691932797431946, 0.7865025401115417, 0.9903982281684875, 0.48568177223205566, 0.9935183525085449, 0.9886826276779175, 0.4633080065250397, 0.7865025401115417, 0.2423480898141861, 0.00009958772716345266, 0.4661126136779785, 0.48337018489837646, 0.23920826613903046, 0.9917830228805542, 0.9935380220413208, 0.7865025401115417, 0.9999004602432251, 0.7865025401115417, 0.00009955812129192054, 0.4887821674346924, 0.9999595880508423, 0.4864705801010132, -0.009201617911458015, 0.0006620592903345823, 1.0013625621795654]
        new Attribute(mesh, "primvars:st:indices", (node) => {
            node.setToken("typeName", "int[]")
            node.setIntArray("default", [0, 4, 8, 2, 3, 2, 9, 11, 12, 10, 5, 7, 6, 1, 3, 13, 1, 0, 2, 3, 7, 5, 0, 1])
        })

        mesh.subdivisionScheme = "none"
        mesh.blenderDataName = "Cube"

        const domeLight = new DomeLight(root, "env_light")
        domeLight.intensity = 0
        // domeLight.textureFile = "./textures/color_0C0C0C.exr"
        new Relationship(domeLight, "inputs:texture:file", {
            isExplicit: true,
            explicit: [material]
        })

        // serialize everything into crate.writer
        crate.serialize(pseudoRoot)
        // crate.print()

        // console.log("----------------")

        // deserialize 
        const stage = new Stage(Buffer.from(crate.writer.buffer))

        // stage._crate.print()

        const pseudoRootIn = stage.getPrimAtPath("/")!.toJSON()

        const filename = prefix.split('/').pop()
        writeFileSync(`${filename}-generated.usdc`, Buffer.from(crate.writer.buffer))
        writeFileSync(`${filename}-original.json`, stringify(orig, { indent: 4 }))
        writeFileSync(`${filename}-generated.json`, stringify(pseudoRootIn, { indent: 4 }))

        compare(pseudoRootIn, orig)
    })
    it.only("regression read", () => {
        const prefix = "spec/examples/cube-textured"
        const buffer = readFileSync(`${prefix}.usdc`)
        const stage = new Stage(buffer)
        const crate = stage._crate

        const pseudoRoot = stage.getPrimAtPath("/")!
        const orig = pseudoRoot.toJSON()
        writeFileSync(`debug.json`, stringify(orig, {indent: 4}))

        // fieldsets are correct...
        expect(stage._crate.fieldsets.fieldset_indices).to.deep.equal([0,1,2,3,4,-1,5,6,7,8,-1,5,6,9,10,-1,5,11,12,13,14,-1,5,15,16,-1,5,17,18,19,-1,5,20,21,-1,5,20,22,-1,5,20,23,-1,5,24,25,-1,26,27,28,-1,29,30,-1,31,32,-1,31,33,-1,34,27,35,-1,34,27,36,-1,34,27,37,-1,38,39,-1,38,40,-1,41,42,-1,43,44,-1,38,45,-1,38,46,-1,38,47,-1,34,48,-1,49,50,-1,43,51,-1,52,53,-1,34,54,-1,27,55,-1,56,57,58,-1,49,-1,59,-1,34,60,-1,34,-1,61,62,-1,63,58,64,-1,31,65,-1,34,27,66,-1,67,52,68,-1,67,52,69,-1])
        // all decoded integers are correct

        // def Shader "Principled_BSDF"
        // {
        //     uniform token info:id = "UsdPreviewSurface"
        //     FIXME: decoded as Float 1
        //     color3f inputs:diffuseColor.connect = </root/_materials/Material/Image_Texture.outputs:rgb>
        //     float inputs:ior = 1.5
        //     float inputs:metallic = 0
        //     float inputs:clearcoat = 0
        //     float inputs:clearcoatRoughness = 0.03
        //     float inputs:roughness = 0.5
        //     FIXME: decoded as "sRGB"
        //     float inputs:opacity = 1
        //     token outputs:surface
        //     float inputs:specular = 0.5
        // }

        // def Shader "Image_Texture"
        // {
        //     uniform token info:id = "UsdUVTexture"
        //     asset inputs:file = @./textures/cubetexture.png@
        //     token inputs:sourceColorSpace = "sRGB"
        //     texCoord2f inputs:st.connect = </root/_materials/Material/uvmap.outputs:result>
        //     token inputs:wrapT = "repeat"
        //     token inputs:wrapS = "repeat"
        //     float3 outputs:rgb
        // }

        const imageTexture = stage.getPrimAtPath("/root/_materials/Material/Image_Texture")

        // uniform token info:id = "UsdUVTexture"
        const infoId = imageTexture.getAttribute("info:id")
        const infoIdDefault = infoId?.getField("default")
        expect(infoIdDefault?.getValue(crate)).to.equal("UsdUVTexture")

        // asset inputs:file = @./textures/cubetexture.png@
        // const file = bug.getAttribute("inputs:file")
        // console.log(file?.toJSON())

        // token inputs:sourceColorSpace = "sRGB"
        const sourceColorSpace = imageTexture.getAttribute("inputs:sourceColorSpace")
        // console.log(sourceColorSpace?.toJSON())
        const tn = sourceColorSpace?.getField("typeName")!
        console.log(tn?.toString())
        const fieldOffset = (tn as any)._offset
        console.log(`_offset: ${fieldOffset} (${fieldOffset/8})`)
        expect(tn.getType()).to.equal(CrateDataType.Token)
        expect(tn.isInlined()).to.be.true
        expect(tn.isArray()).to.be.false
        expect(tn.isCompressed()).to.be.false
        console.log(`index: ${tn.getIndex()}`)
        console.log(stage._crate.tokens.get(78))
        console.log(tn.getValue(stage._crate))
        expect(tn.getValue(stage._crate), "/root/_materials/Material/Image_Textureinputs:sourceColorSpace@typeName").to.equal("token")

        // console.log(JSON.stringify(orig, undefined, 4))
    })
})

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