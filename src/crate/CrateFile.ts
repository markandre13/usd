import { BootStrap } from "./BootStrap.ts"
import { Field } from "./Field.ts"
import { decompressFromBuffer, decodeIntegers, type StringIndex } from "../index.ts"
import type { Reader } from "./Reader.ts"
import { SectionName } from "./SectionName.ts"
import { TableOfContents } from "./TableOfContents.ts"
import { ValueRep } from "./ValueRep.ts"
import { UsdNode } from "./UsdNode.ts"
import { SpecType } from "./SpecType.js"
import type { Spec } from "./Spec.ts"

// https://docs.nvidia.com/learn-openusd/latest/stage-setting/index.html
// stage, layer
// the tree of nodes contains prim and attribute
// nodes have fields: fieldset, field

// stage.DefinePrim(path, prim_type)
// UsdGeom.Xform.Define(stage, path)
// prim.GetChildren()
// prim.GetTypeName()
// prim.GetProperties()

// stage: Usd.Stage = Usd.Stage.CreateNew("_assets/prims.usda")
// # Define a new primitive at the path "/hello" on the current stage:
// stage.definePrim("/hello")
// # Define a new primitive at the path "/world" on the current stage with the prim type, Sphere.
// stage.definePrim("/world", "Sphere")
// stage.save()
// #usda 1.0
// def "hello"
// {
// }
// def Sphere "world"
// {
// }

// from pxr import Usd, UsdGeom
// file_path = "_assets/sphere_prim.usda"
// stage: Usd.Stage = Usd.Stage.CreateNew(file_path)
// # Define a prim of type `Sphere` at path `/hello`:
// sphere: UsdGeom.Sphere = UsdGeom.Sphere.Define(stage, "/hello")
// sphere.CreateRadiusAttr().Set(2)
// # Save the stage:
// stage.Save()

// #usda 1.0

// def Sphere "hello"
// {
//     double radius = 2
// }

// blender/source/blender/io/usd/intern/usd_capi_export.cc:
// pxr::UsdStageRefPtr usd_stage = pxr::UsdStage::CreateNew(filepath);
// both of the following end up as fields...
// usd_stage->SetMetadata(pxr::UsdGeomTokens->metersPerUnit, double(scene->unit.scale_length));
// usd_stage->GetRootLayer()->SetDocumentation(std::string("Blender v") + BKE_blender_version_string());

interface BuildDecompressedPathsArg {
    pathIndexes: number[]
    elementTokenIndexes: number[]
    jumps: number[]
}

export class CrateFile {
    bootstrap: BootStrap
    toc: TableOfContents

    tokens!: string[]
    strings!: StringIndex[]
    fields!: Field[]
    fieldset_indices!: number[]
    _nodes!: UsdNode[]
    _specs!: Spec[]

    reader: Reader

    constructor(reader: Reader) {
        this.reader = reader
        this.bootstrap = new BootStrap(reader)
        reader.offset = this.bootstrap.tocOffset
        this.toc = new TableOfContents(reader)
        this.readTokens(reader)
        this.readStrings(reader)
        this.readFields(reader)
        this.readFieldSets(reader)
        this.readPaths(reader)
        this.readSpecs(reader)

        for (let i = 0; i < this._nodes!.length; i++) {
            this._nodes[i].spec_index = this._specs[i].path_index
        }
    }

    readTokens(reader: Reader) {
        const section = this.toc.sections.get(SectionName.TOKENS)
        if (section === undefined) {
            return
        }
        reader.offset = section.start
        const numTokens = reader.getUint64()
        const uncompressedSize = reader.getUint64()
        const compressedSize = reader.getUint64()

        if (compressedSize > section.size - 24) {
            throw Error(`TOKENS section: compressed size exceeds section`)
        }

        const compressed = new Uint8Array(reader._dataview.buffer, reader.offset, compressedSize)
        const uncompressed = new Uint8Array(uncompressedSize)
        const n = decompressFromBuffer(compressed, uncompressed)
        if (n !== uncompressedSize) {
            throw Error(`CrateFile::readTokens(): failed to decompress: uncompressed ${n} but excepted ${uncompressedSize}`)
        }

        this.tokens = new Array<string>(numTokens)

        let name = ""
        let tokenIndex = 0
        for (let i = 0; i < uncompressedSize; ++i) {
            const c = uncompressed[i]
            if (c === 0) {
                if (tokenIndex >= numTokens) {
                    throw Error(`too many tokens`)
                }
                this.tokens[tokenIndex] = name
                ++tokenIndex
                name = ""
            } else {
                name += String.fromCharCode(c)
            }
        }
        if (numTokens !== tokenIndex) {
            throw Error(`not enough tokens`)
        }
    }

    readStrings(reader: Reader) {
        const section = this.toc.sections.get(SectionName.STRINGS)
        if (section === undefined) {
            return
        }
        reader.offset = section.start
        const n = reader.getUint64()
        this.strings = new Array(n)
        for (let i = 0; i < n; ++i) {
            this.strings[i] = reader.getUint32()
        }
        if (section.start + section.size !== reader.offset) {
            throw Error(`STRINGS: not at end: expected end at ${section.start + section.size} but reader is at ${reader.offset}`)
        }
    }

    readFields(reader: Reader) {
        const section = this.toc.sections.get(SectionName.FIELDS)
        if (section === undefined) {
            return
        }
        reader.offset = section.start
        const numFields = reader.getUint64()

        const indices = reader.getCompressedIntegers(numFields)

        const compressedSize = reader.getUint64()
        const uncompressedSize = numFields * 8
        const compressed = new Uint8Array(reader._dataview.buffer, reader.offset, compressedSize)
        const uncompressed = new Uint8Array(uncompressedSize)
        if (uncompressedSize !== decompressFromBuffer(compressed, uncompressed)) {
            throw Error("Failed to read Fields ValueRep data.")
        }

        const dataview = new DataView(uncompressed.buffer)
        this.fields = new Array(numFields)
        for (let i = 0; i < numFields; ++i) {
            this.fields[i] = new Field(indices[i], new ValueRep(dataview, i * 8))
        }

        // for (let i = 0; i < numFields; ++i) {
        //     console.log(`fields[${i}] = ${this.fields[i].toString(this.tokens)}`)
        // }
        // if (section.start + section.size !== reader.offset) {
        //     throw Error(`FIELDS: not at end: expected end at ${section.start + section.size} but reader is at ${reader.offset}`)
        // }
    }

    readFieldSets(reader: Reader) {
        const section = this.toc.sections.get(SectionName.FIELDSETS)
        if (section === undefined) {
            return
        }
        reader.offset = section.start
        this.fieldset_indices = reader.getCompressedIntegers()
    }

    readPaths(reader: Reader) {
        const section = this.toc.sections.get(SectionName.PATHS)
        if (section === undefined) {
            return
        }
        reader.offset = section.start

        const num_nodes = reader.getUint64()
        const numEncodedPaths = reader.getUint64()
        const pathIndexes = reader.getCompressedIntegers(numEncodedPaths)
        const elementTokenIndexes = reader.getCompressedIntegers(numEncodedPaths)
        const jumps = reader.getCompressedIntegers(numEncodedPaths)

        this._nodes = new Array<UsdNode>(num_nodes)
        const node = this.buildNodeTree({
            pathIndexes,
            elementTokenIndexes,
            jumps
        })
    }

    readSpecs(reader: Reader) {
        const section = this.toc.sections.get(SectionName.SPECS)
        if (section === undefined) {
            return
        }
        reader.offset = section.start

        const num_specs = reader.getUint64()

        const pathIndexes = reader.getCompressedIntegers(num_specs)
        const fieldsetIndexes = reader.getCompressedIntegers(num_specs)
        const specTypeIndexes = reader.getCompressedIntegers(num_specs)

        this._specs = new Array(num_specs)
        for (let i = 0; i < num_specs; ++i) {
            this._specs[i] = {
                path_index: pathIndexes[i],
                fieldset_index: fieldsetIndexes[i],
                spec_type: specTypeIndexes[i] as SpecType
            }
        }
    }

    private buildNodeTree(
        arg: BuildDecompressedPathsArg,
        parentNode: UsdNode | undefined = undefined,
        curIndex: number = 0
    ) {
        let hasChild = true, hasSibling = true
        let root: UsdNode | undefined
        while (hasChild || hasSibling) {
            const thisIndex = curIndex++
            const idx = arg.pathIndexes[thisIndex]
            const jump = arg.jumps[thisIndex]

            // console.log(`thisIndex = ${thisIndex}, pathIndexes.size = ${arg.pathIndexes.length}`)
            if (parentNode === undefined) {
                root = parentNode = new UsdNode(this, undefined, idx, "/", true)
                // console.log(`paths[${arg.pathIndexes[thisIndex]}] is parent. name = ${parentPath.getFullPathName()}`)
                if (thisIndex >= arg.pathIndexes.length) {
                    throw Error("yikes: Index exceeds pathIndexes.size()")
                }
                this._nodes![idx] = parentNode
            } else {
                if (thisIndex >= arg.elementTokenIndexes.length) {
                    throw Error(`Index exceeds elementTokenIndexes.length`)
                }
                let tokenIndex = arg.elementTokenIndexes[thisIndex]
                let isPrimPropertyPath: boolean
                if (tokenIndex < 0) {
                    tokenIndex = -tokenIndex
                    isPrimPropertyPath = false
                } else {
                    isPrimPropertyPath = true
                }
                // console.log(`tokenIndex = ${tokenIndex}, _tokens.size = ${this.tokens!.length}`)

                if (tokenIndex >= this.tokens!.length) {
                    throw Error(`Invalid tokenIndex in BuildDecompressedPathsImpl.`)
                }
                const elemToken = this.tokens![tokenIndex]
                if (this._nodes![idx] !== undefined) {
                    throw Error("yikes")
                }
                this._nodes![idx] = new UsdNode(this, parentNode, idx, elemToken, isPrimPropertyPath)
            }

            hasChild = jump > 0 || jump === -1
            hasSibling = jump >= 0

            if (hasChild) {
                if (hasSibling) {
                    const siblingIndex = thisIndex + jump
                    this.buildNodeTree(arg, parentNode, siblingIndex)
                }
                parentNode = this._nodes![idx] // reset parent path
            }
        }
        return root
    }
}

