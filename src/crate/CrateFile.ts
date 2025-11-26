import { BootStrap } from "./BootStrap.ts"
import { Field } from "./Field.ts"
import { decompressFromBuffer, readCompressedInts, decodeIntegers, type StringIndex } from "../index.ts"
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

        const indices = readCompressedInts(reader, numFields)

        const reps_size = reader.getUint64()
        const uncompressedSize = numFields * 8
        const compressed = new Uint8Array(reader._dataview.buffer, reader.offset, reps_size)
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

        const numFieldSets = reader.getUint64()
        const fsets_size = reader.getUint64()
        // console.log(`numFieldSets = ${numFieldSets}, fsets_size = ${fsets_size}`)
        // const indices = readCompressedInts(reader, numFieldSets)
        // _GetEncodedBufferSize()
        const comp_buffer = new Uint8Array(reader._dataview.buffer, reader.offset, fsets_size)
        // hexdump(comp_buffer)
        const workingSpaceSize = 4 + Math.floor((numFieldSets * 2 + 7) / 8) + numFieldSets * 4
        // console.log(`workingSpaceSize = ${workingSpaceSize}`)
        const workingSpace = new Uint8Array(workingSpaceSize)

        const decompSz = decompressFromBuffer(comp_buffer, workingSpace)
        // hexdump(workingSpace, 0, decompSz)
        this.fieldset_indices = decodeIntegers(new DataView(workingSpace.buffer), numFieldSets)
        // this.fieldset_indices.forEach((v, i) => {
        //     console.log(`fieldset_index[${i}] = ${v}`)
        // })
    }

    readPaths(reader: Reader) {
        //
        // bool CrateReader::ReadPaths()
        //

        const section = this.toc.sections.get(SectionName.PATHS)
        if (section === undefined) {
            return
        }
        reader.offset = section.start

        const num_paths = reader.getUint64()

        this._nodes = new Array<UsdNode>(num_paths)

        //
        // bool CrateReader::ReadCompressedPaths(const uint64_t maxNumPaths)
        //
        const maxNumPaths = num_paths

        const numEncodedPaths = reader.getUint64()

        // pathIndexes
        const compPathIndexesSize = reader.getUint64()

        // console.log(`maxNumPaths = ${maxNumPaths}, numEncodedPaths=${numEncodedPaths}, compPathIndexesSize=${compPathIndexesSize}`)
        let comp_buffer = new Uint8Array(reader._dataview.buffer, reader.offset, compPathIndexesSize)
        reader.offset += compPathIndexesSize
        // hexdump(comp_buffer)
        const workspaceBufferSize = 4 + Math.floor((numEncodedPaths * 2 + 7) / 8) + numEncodedPaths * 4
        // console.log(`workspaceBufferSize = ${workspaceBufferSize}`)
        const workingSpace = new Uint8Array(workspaceBufferSize)

        const decompSz = decompressFromBuffer(comp_buffer, workingSpace)
        const pathIndexes = decodeIntegers(new DataView(workingSpace.buffer), numEncodedPaths)

        // elementTokenIndexes
        const compElementTokenIndexesSize = reader.getUint64()
        comp_buffer = new Uint8Array(reader._dataview.buffer, reader.offset, compElementTokenIndexesSize)
        reader.offset += compElementTokenIndexesSize

        const n = decompressFromBuffer(comp_buffer, workingSpace)
        const elementTokenIndexes = decodeIntegers(new DataView(workingSpace.buffer), numEncodedPaths)

        // jumps
        const compJumpsSize = reader.getUint64()
        // console.log(`compJumpsSize = ${compJumpsSize}`)

        comp_buffer = new Uint8Array(reader._dataview.buffer, reader.offset, compJumpsSize)
        reader.offset += compJumpsSize

        decompressFromBuffer(comp_buffer, workingSpace)
        const jumps = decodeIntegers(new DataView(workingSpace.buffer), numEncodedPaths)
        // console.log(jumps)

        const visit_table = new Array()

        const arg: BuildDecompressedPathsArg = {
            pathIndexes,
            elementTokenIndexes,
            jumps
        }

        const node = this.BuildDecompressedPathsImpl(arg)
        // node?.print()

        // print paths

        // TODO:
        // Ensure decoded numEncodedPaths.
        // Now build node hierarchy. (really?)
    }

    readSpecs(reader: Reader) {
        const section = this.toc.sections.get(SectionName.SPECS)
        if (section === undefined) {
            return
        }
        reader.offset = section.start

        const num_specs = reader.getUint64()

        this._specs = new Array(num_specs)

        const workBufferSize = 4 + Math.floor((num_specs * 2 + 7) / 8) + num_specs * 4
        const workingSpace = new Uint8Array(workBufferSize)

        const path_indexes_size = reader.getUint64()
        let comp_buffer = new Uint8Array(reader._dataview.buffer, reader.offset, path_indexes_size)
        reader.offset += path_indexes_size

        let decompSz = decompressFromBuffer(comp_buffer, workingSpace)
        const pathIndexes = decodeIntegers(new DataView(workingSpace.buffer), num_specs)

        // for(let i = 0; i < num_specs; ++i) {
        //     console.log(`spec[${i}].path_index = ${pathIndexes[i]}`)
        // }

        const fieldset_indexes_size = reader.getUint64()
        comp_buffer = new Uint8Array(reader._dataview.buffer, reader.offset, fieldset_indexes_size)
        reader.offset += fieldset_indexes_size

        decompSz = decompressFromBuffer(comp_buffer, workingSpace)
        const fieldsetIndexes = decodeIntegers(new DataView(workingSpace.buffer), num_specs)

        // for(let i = 0; i < num_specs; ++i) {
        //     console.log(`spec[${i}].fieldset_index = ${fieldsetIndexes[i]}`)
        // }

        const spectype_size = reader.getUint64()
        comp_buffer = new Uint8Array(reader._dataview.buffer, reader.offset, spectype_size)
        reader.offset += spectype_size

        decompSz = decompressFromBuffer(comp_buffer, workingSpace)
        const specTypeIndexes = decodeIntegers(new DataView(workingSpace.buffer), num_specs)

        // for (let i = 0; i < num_specs; ++i) {
        //     console.log(`spec[${i}].spec_type = ${specTypeIndexes[i]}`)
        // }

        for (let i = 0; i < num_specs; ++i) {
            this._specs[i] = {
                path_index: pathIndexes[i],
                fieldset_index: fieldsetIndexes[i],
                spec_type: specTypeIndexes[i] as SpecType
            }
        }
    }

    private BuildDecompressedPathsImpl(
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
                    this.BuildDecompressedPathsImpl(arg, parentNode, siblingIndex)
                }
                parentNode = this._nodes![idx] // reset parent path
            }
        }
        return root
    }
}

