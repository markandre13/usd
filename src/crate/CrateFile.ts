import { BootStrap } from "./BootStrap.ts"
import { Field } from "./Field.ts"
import { decompressFromBuffer, readCompressedInts, decodeIntegers, type StringIndex } from "../index.ts"
import { Path } from "../path/Path.ts"
import type { Reader } from "./Reader.ts"
import { SectionName } from "./SectionName.ts"
import { TableOfContents } from "./TableOfContents.ts"
import { ValueRep } from "./ValueRep.ts"
import { CrateDataType, ListOpHeader } from "./CrateDataType.ts"
import { UsdNode } from "./UsdNode.ts"
import { SpecType } from "./SpecType.js"
import type { Spec } from "./Spec.ts"
import { Variability } from "./Variability.ts"
import { Specifier } from "./Specifier.ts"

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
    // visit_table: boolean[]
    // startIndex: number // usually 0
    // endIndex: number // inclusive. usually pathIndexes.size() - 1
    // parentPath?: Path
}

export class CrateFile {
    bootstrap: BootStrap
    toc: TableOfContents

    tokens!: string[]
    strings!: StringIndex[]
    fields!: Field[]
    fieldset_indices!: number[]
    // paths is the 3 following data structures?
    _paths!: Path[]
    // _elemPaths?: Path[]
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

        this.BuildLiveFieldSets()


        /// bool USDCReader::Impl::ReconstructStage(Stage *stage) {

        const path_index_to_spec_index_map = new Map<number, number>()
        for (let i = 0; i < this._specs!.length; i++) {
            // console.log(`path index[${i}] -> spec index [${this._specs[i].path_index}]`)
            path_index_to_spec_index_map.set(this._specs[i].path_index, i)
        }

        this.ReconstructPrimRecursively(-1, 0, undefined, 0, path_index_to_spec_index_map)
        // stage->compute_absolute_prim_path_and_assign_prim_id();


        // this._mynodes![0].print()

        // for(let i=0; i<this.fields!.length; ++i) {
        //     const f = this.fields![i]!
        //     console.log(`fields[${i}] (${this.tokens![f.tokenIndex]}) = ${f.toString()}`)
        // }
    }

    private ReconstructPrimRecursively(
        parent: number,
        current: number,
        parentPrim: object | undefined,
        level: number,
        psmap: Map<number, number>
    ) {
        // const is_parent_variant = this._variantPrims.count(parent)
        const is_parent_variant = false

        this.ReconstructPrimNode(parent, current, level, is_parent_variant, psmap)

        // traverse children
        for (const child of this._nodes[current].children) {
            // console.log(`traverse child ${child.name}`)
            this.ReconstructPrimRecursively(current, child.index, undefined, level + 1, psmap)
        }
    }

    // ReconstrcutStageMeta
    private ReconstructPrimNode(
        parent: number,
        current: number,
        level: number,
        is_parent_variant: boolean,
        psmap: Map<number, number>
    ) {
        const spec_index = psmap.get(current)!
        const spec = this._specs[spec_index]

        if (this._nodes[current].spec_index !== undefined) {
            throw Error(`yikes: mynodes[${current}].spec_index = ${this._nodes[current].spec_index}, but wanted to set to ${spec_index}`)
        }
        this._nodes[current].spec_index = spec_index

        if (spec.spec_type === SpecType.Attribute || spec.spec_type === SpecType.Relationship) {
            // if (this._)
            // This node is a Properties node. These are processed in
            // ReconstructPrim(), so nothing to do here.
            // console.log(`TODO: may have found a property node ${this._mynodes[current].name}`)
            // console.log(`---------- PROP ${this._mynodes[current].name} (spec.fieldset_index=${spec.fieldset_index})`)
            this.ReconstructStageMeta(spec.fieldset_index)
            return
        }
        // console.log(`get ${spec.fieldset_index}`)
        if (current === 0) {
            if (spec.spec_type !== SpecType.PseudoRoot) {
                throw Error("SpecType.PseudoRoot expected for root layer(Stage) element.")
            }
            this.ReconstructStageMeta(spec.fieldset_index)
            return
        }

        switch (spec.spec_type) {
            case SpecType.PseudoRoot:
                throw Error("SpecType.PseudoRoot in a child node is not supported(yet)")
            case SpecType.Prim: {
                // console.log(`---------- PRIM ${this._mynodes[current].name}`)
                this.ParsePrimSpec()
                this.ReconstructStageMeta(spec.fieldset_index)
            } break
            default:
                throw Error('yikes')
        }
    }

    ParsePrimSpec() {

    }

    // tinyusdz has most of it's unpack code in bool CrateReader::UnpackValueRep(const crate::ValueRep &rep, crate::CrateValue *value) {
    ReconstructStageMeta(fieldset_index: number) {
        return
        for (; this.fieldset_indices[fieldset_index] >= 0; ++fieldset_index) {
            const fieldIndex = this.fieldset_indices[fieldset_index]
            const field = this.fields[fieldIndex]
            const token = this.tokens[field.tokenIndex]
            switch (field.valueRep.getType()) {
                case CrateDataType.Bool:
                    console.log(`${fieldIndex} ${token} = ${field.valueRep.getBool()}`)
                    break
                case CrateDataType.Float:
                    console.log(`${fieldIndex} ${token} = ${field.valueRep.getFloat()}`)
                    break
                case CrateDataType.Double:
                    console.log(`${fieldIndex} ${token} = ${field.valueRep.getDouble()}`)
                    break
                case CrateDataType.Token:
                    if (!field.valueRep.isArray() && field.valueRep.isInlined() && !field.valueRep.isCompressed()) {
                        console.log(`${fieldIndex} ${token} = ${this.tokens[field.valueRep.getIndex()]}`)
                    } else if (field.valueRep.isArray() && !field.valueRep.isInlined() && !field.valueRep.isCompressed()) {
                        this.reader.offset = field.valueRep.getIndex()
                        const n = this.reader.getUint64()
                        const arr = new Array<string>(n)
                        for (let i = 0; i < n; ++i) {
                            arr[i] = this.tokens[this.reader.getInt32()]
                        }
                        console.log(`${fieldIndex} ${token} = %o`, arr)
                    } else {
                        console.log(`${fieldIndex} token=${token} ${field}`)
                    }
                    break
                case CrateDataType.String:
                    console.log(`${fieldIndex} ${token} = "${this.tokens[this.strings[field.valueRep.getIndex()]]}"`)
                    break
                case CrateDataType.Specifier:
                    if (!field.valueRep.isArray() && field.valueRep.isInlined() && !field.valueRep.isCompressed()) {
                        console.log(`${fieldIndex} ${token} = ${Specifier[field.valueRep.getIndex()]}`)
                    } else {
                        console.log(`${fieldIndex} token=${token} ${field}`)
                    }
                    break
                case CrateDataType.Int:
                    if (field.valueRep.isArray() && !field.valueRep.isInlined() && !field.valueRep.isCompressed()) {
                        this.reader.offset = field.valueRep.getIndex()
                        const n = this.reader.getUint64()
                        const arr = new Array<number>(n)
                        for (let i = 0; i < n; ++i) {
                            arr[i] = this.reader.getInt32()
                        }
                        console.log(`${fieldIndex} ${token} = %o`, arr)
                    } else if (field.valueRep.isArray() && !field.valueRep.isInlined() && field.valueRep.isCompressed()) {
                        this.reader.offset = field.valueRep.getIndex()
                        const n = this.reader.getUint64()
                        const compSize = this.reader.getUint64()
                        const comp_buffer = new Uint8Array(this.reader._dataview.buffer, this.reader.offset, compSize)
                        const workingSpaceSize = 4 + Math.floor((n * 2 + 7) / 8) + n * 4
                        const workingSpace = new Uint8Array(workingSpaceSize)
                        const decompSz = decompressFromBuffer(comp_buffer, workingSpace)
                        const arr = decodeIntegers(new DataView(workingSpace.buffer), n)
                        console.log(`${fieldIndex} ${token} = %o`, arr)
                    } else {
                        console.log(`${fieldIndex} ${token} ${field}`)
                    }
                    break
                case CrateDataType.Vec2f:
                case CrateDataType.Vec3f:
                case CrateDataType.Vec4f: {
                    let size = 0
                    switch (field.valueRep.getType()) {
                        case CrateDataType.Vec2f:
                            size = 2
                            break
                        case CrateDataType.Vec3f:
                            size = 3
                            break
                        case CrateDataType.Vec4f:
                            size = 4
                            break
                    }
                    if (field.valueRep.isArray() && !field.valueRep.isInlined() && !field.valueRep.isCompressed()) {
                        this.reader.offset = field.valueRep.getIndex()
                        const n = this.reader.getUint64()
                        const arr = new Array<number>(n * size)
                        for (let i = 0; i < n * size; ++i) {
                            arr[i] = this.reader.getFloat32()
                        }
                        console.log(`${fieldIndex} ${token} = %o`, arr)
                    } else
                        if (!field.valueRep.isArray() && !field.valueRep.isInlined() && !field.valueRep.isCompressed()) {
                            this.reader.offset = field.valueRep.getIndex()
                            const arr = new Array<number>(3)
                            for (let i = 0; i < 3; ++i) {
                                arr[i] = this.reader.getFloat32()
                            }
                            console.log(`${fieldIndex} ${token} = %o`, arr)
                        } else if (!field.valueRep.isArray() && field.valueRep.isInlined() && !field.valueRep.isCompressed()) {
                            console.log(`${fieldIndex} ${token} = %o`, field.valueRep.getVec3f())
                        } else {
                            console.log(`${fieldIndex} ${token} ${field}`)
                        }
                } break
                case CrateDataType.TokenVector: {
                    this.reader.offset = field.valueRep.getIndex()
                    const n = this.reader.getUint64()
                    const arr = new Array<string>(n)
                    for (let i = 0; i < n; ++i) {
                        const idx = this.reader.getUint32()
                        arr[i] = this.tokens[idx]
                    }
                    console.log(`${fieldIndex} ${token} = %o`, arr)
                } break
                case CrateDataType.AssetPath: {
                    if (!field.valueRep.isArray() && field.valueRep.isInlined() && !field.valueRep.isCompressed()) {
                        console.log(`${fieldIndex} ${token} = "${this.tokens[field.valueRep.getIndex()]}"`)
                    } else {
                        console.log(`${fieldIndex} token=${token} ${field}`)
                    }
                } break
                case CrateDataType.Variability: {
                    // uniform token info:id = "UsdPreviewSurface"
                    if (!field.valueRep.isArray() && field.valueRep.isInlined() && !field.valueRep.isCompressed()) {
                        const v = field.valueRep.getIndex() as Variability
                        console.log(`${fieldIndex} ${token} = ${Variability[v]}`)
                    } else {
                        console.log(`${fieldIndex} token=${token} ${field}`)
                    }
                    // const idx = field.valueRep.getIndex()
                    // console.log(`  idx=${idx}`)
                    // this.reader.offset = idx
                    // const n = this.reader.getUint64()
                    // console.log(`  n=${n}`)
                    // let txt = ""
                    // for(let i=0; i<n; ++i) {
                    //     const keyIdx = this.reader.getUint32()
                    //     const valueIDx = this.reader.getUint32()
                    //     console.log(`    ${keyIdx} = ${valueIDx}`)
                    //     // const key = this.tokens[this.reader.getUint32()]
                    //     // const value = this.tokens[this.reader.getUint32()]
                    //     // txt = `${txt} "${key}" = "${value}", `
                    // }
                    // console.log(`${idx} ${token} = ${txt} <<<<<<<<<<<<<<<<<<<<<<<<<`)
                } break
                case CrateDataType.Dictionary: {
                    this.reader.offset = field.valueRep.getIndex()
                    const n = this.reader.getUint64()
                    for (let i = 0; i < n; ++i) {
                        const key = this.tokens[this.strings[this.reader.getUint32()]]
                        const offset = this.reader.getUint64()
                        // this.reader.offset += offset - 8
                        // read ValueRep
                        // UnpackValueRep // NOTE: just reading the ValueRep might be enough if I implement on-demand read
                        console.log(`${key} = ? (offset=${offset})`)
                        break
                    }
                    console.log(`${fieldIndex} token=${token} ${field} DICT ${n}`)
                } break
                case CrateDataType.TokenListOp:
                    if (!field.valueRep.isArray() && !field.valueRep.isInlined() && !field.valueRep.isCompressed()) {
                        console.log(`${fieldIndex} token = ${token}`)
                        this.reader.offset = field.valueRep.getIndex()
                        const hdr = new ListOpHeader(this.reader)

                        const read = () => {
                            const n = this.reader.getUint64()
                            const arr = new Array<string>(n)
                            for (let i = 0; i < n; ++i) {
                                arr[i] = this.tokens[this.reader.getUint32()]
                            }
                            return arr
                        }
                        if (hdr.isExplicit()) {
                            console.log(`  explicit: %o`, read())
                        }
                        if (hdr.hasAddedItems()) {
                            console.log(`  add: %o`, read())
                        }
                        if (hdr.hasPrependedItems()) {
                            console.log(`  prepend: %o`, read())
                        }
                        if (hdr.hasAppendedItems()) {
                            console.log(`  append: %o`, read())
                        }
                        if (hdr.hasDeletedItems()) {
                            console.log(`  delete: %o`, read())
                        }
                        if (hdr.hasOrderedItems()) {
                            console.log(`  order: %o`, read())
                        }
                    } else {
                        console.log(`${fieldIndex} token=${token} ${field}`)
                    }
                    break
                case CrateDataType.PathListOp:
                    if (!field.valueRep.isArray() && !field.valueRep.isInlined() && !field.valueRep.isCompressed()) {
                        console.log(`${fieldIndex} token = ${token}`)
                        this.reader.offset = field.valueRep.getIndex()
                        const hdr = new ListOpHeader(this.reader)

                        const read = () => {
                            const n = this.reader.getUint64()
                            const arr = new Array<Path>(n)
                            for (let i = 0; i < n; ++i) {
                                arr[i] = this._paths[this.reader.getUint32()]
                            }
                            return arr
                        }
                        if (hdr.isExplicit()) {
                            console.log(`  explicit: [${read().join(", ")}]`)
                        }
                        if (hdr.hasAddedItems()) {
                            console.log(`  add: [${read().join(", ")}]`)
                        }
                        if (hdr.hasPrependedItems()) {
                            console.log(`  prepend: [${read().join(", ")}]`)
                        }
                        if (hdr.hasAppendedItems()) {
                            console.log(`  append: [${read().join(", ")}]`)
                        }
                        if (hdr.hasDeletedItems()) {
                            console.log(`  delete: [${read().join(", ")}]`)
                        }
                        if (hdr.hasOrderedItems()) {
                            console.log(`  order: [${read().join(", ")}]`)
                        }
                    } else {
                        console.log(`${fieldIndex} token=${token} ${field}`)
                    }
                    break
                default:
                    console.log(`${fieldIndex} token=${token} ${field}`)
            }
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

        this._paths = new Array<Path>(num_paths)
        const _elemPaths = new Array<Path>(num_paths)
        const _nodes = new Array<Node>(num_paths)
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

            // this._mynodes![pathIndexes[i]].type = specTypeIndexes[i] as SpecType
            // this._mynodes[pathIndexes[i]].type = this.fieldset_indices[fieldsetIndexes]
        }
    }

    BuildLiveFieldSets() {
        // ...

        // for (const a of this.fieldset_indices!) {
        //     if (a >= 0) {
        //         console.log(`${a}\t${this.tokens[this.fields[a].tokenIndex]}`)
        //     } else {
        //         console.log("--------------")
        //     }
        //     console.log(``)
        // }
        // let sum = 0
        // for(const item of this._live_fieldsets) {
        //     console.log(`livefieldsets[${item.first.value}].count = ${item.second.length}`)
        //     sum += item.second.length
        //     for(const x of item.second) {

        //     }
        // }
    }

    private BuildDecompressedPathsImpl(
        arg: BuildDecompressedPathsArg,
        parentPath: Path | undefined = undefined,
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
            if (parentPath === undefined) {
                parentPath = Path.makeRootPath()
                root = parentNode = new UsdNode(this, undefined, idx, "/", true)
                // console.log(`paths[${arg.pathIndexes[thisIndex]}] is parent. name = ${parentPath.getFullPathName()}`)
                if (thisIndex >= arg.pathIndexes.length) {
                    throw Error("yikes: Index exceeds pathIndexes.size()")
                }
                this._nodes![idx] = parentNode
                this._paths![idx] = parentPath
                // console.log(`path[${idx}] = /`)
                // console.log('make root node /')
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
                // console.log(`path[${idx}] = ${parentPath._element} -> ${elemToken} (${parentNode?.name} -> ${elemToken})`)
                // const node = new MyNode(thisNode, elemToken)
                // console.log(`node ${parentNode?.name} add ${thisNode.name}`)
                if (this._nodes![idx] !== undefined) {
                    throw Error("yikes")
                }
                this._nodes![idx] = new UsdNode(this, parentNode, idx, elemToken, isPrimPropertyPath)
                this._paths![idx] = isPrimPropertyPath ?
                    parentPath.AppendProperty(elemToken)
                    : parentPath.AppendElement(elemToken) // prim, variantSelection, etc.
                // _elemPaths[idx] = Path(elemToken, "");
            }

            hasChild = jump > 0 || jump === -1
            hasSibling = jump >= 0

            if (hasChild) {
                if (hasSibling) {
                    const siblingIndex = thisIndex + jump
                    this.BuildDecompressedPathsImpl(arg, parentPath, parentNode, siblingIndex)
                }
                parentPath = this._paths![idx] // reset parent path
                parentNode = this._nodes![idx] // reset parent path
            }
        }
        return root
    }
}

