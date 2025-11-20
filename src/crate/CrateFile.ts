import { BootStrap } from "./BootStrap.ts"
import { Field } from "./Field.ts"
import { decompressFromBuffer, readCompressedInts, decodeIntegers, type StringIndex } from "../index.ts"
import { Node, Path } from "../path/Path.ts"
import type { Reader } from "./Reader.ts"
import { SectionName } from "./SectionName.ts"
import { TableOfContents } from "./TableOfContents.ts"
import { ValueRep } from "./ValueRep.ts"
import { CrateDataType } from "./CrateDataType.ts"

interface BuildDecompressedPathsArg {
    pathIndexes: number[]
    elementTokenIndexes: number[]
    jumps: number[]
    // visit_table: boolean[]
    // startIndex: number // usually 0
    // endIndex: number // inclusive. usually pathIndexes.size() - 1
    // parentPath?: Path
}

class MyNode {
    parent?: MyNode
    children: MyNode[] = []

    name: string
    /** true mean this entry has a value */
    prim: boolean

    type!: SpecType

    constructor(parent?: MyNode, name: string = "/", prim: boolean = false) {
        this.parent = parent
        if (parent !== undefined) {
            parent.children.push(this)
        }
        this.name = name
        this.prim = prim
    }
    print(indent: number = 0) {
        console.log(`${"  ".repeat(indent)} ${this.name}${this.prim ? " = ..." : ""} ${SpecType[this.type]}`)
        for (const child of this.children) {
            child.print(indent + 1)
        }
    }
}

// SpecType enum must be same order with pxrUSD's SdfSpecType(since enum value
// is stored in Crate directly)
enum SpecType {
    Unknown,
    Attribute,
    Connection,
    Expression,
    Mapper,
    MapperArg,
    Prim,
    PseudoRoot,
    Relationship,
    RelationshipTarget,
    Variant,
    VariantSet,
    Invalid,  // or NumSpecTypes
};

// Spec describes the relation of a path(i.e. node) and field(e.g. vertex data)
interface Spec {
    path_index: number
    fieldset_index: number
    spec_type: SpecType
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
    // _nodes?: Node[]
    _mynodes!: MyNode[]
    _specs!: Spec[]

    constructor(reader: Reader) {
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
    }

    private ReconstructPrimNode(
        parent: number,
        current: number,
        level: number,
        is_parent_variant: boolean,
        psmap: Map<number, number>
    ) {
        const spec_index = psmap.get(current)!
        const spec = this._specs[spec_index]
        if (spec.spec_type === SpecType.Attribute || spec.spec_type === SpecType.Relationship) {
            // if (this._)
            throw Error('yikes')
        }
        // console.log(`get ${spec.fieldset_index}`)
        if (current === 0) {
            if (spec.spec_type !== SpecType.PseudoRoot) {
                throw Error("SpecType.PseudoRoot expected for root layer(Stage) element.")
            }
            this.ReconstrcutStageMeta(spec.fieldset_index)
        }
    }

    private ReconstrcutStageMeta(fieldset_index: number) {
        for(;this.fieldset_indices[fieldset_index] >= 0; ++fieldset_index) {
            const idx = this.fieldset_indices[fieldset_index]
            const field = this.fields[idx]
            const token = this.tokens[field.tokenIndex]
            switch(field.valueRep.getType()) {
                case CrateDataType.Double:
                    console.log(`${idx} ${token} = ${field.valueRep.getDouble()}`)
                    break
                case CrateDataType.Token:
                    console.log(`${idx} ${token} = ${this.tokens[new Number(field.valueRep.getPayload()).valueOf()]}`)
                    break
                case CrateDataType.String:
                    console.log(`${idx} ${token} = "${this.tokens[this.strings[field.valueRep.getIndex()]]}"`)
                    break
                default:
                    console.log(`${idx} ${token} ${field}`)
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

        this.fields = new Array(numFields)
        for (let i = 0; i < numFields; ++i) {
            this.fields[i] = new Field(indices[i], new ValueRep(uncompressed, i * 8))
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
        this._mynodes = new Array<MyNode>(num_paths)

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
        parentNode: MyNode | undefined = undefined,
        curIndex: number = 0
    ) {
        let hasChild = true, hasSibling = true
        let root: MyNode | undefined
        while (hasChild || hasSibling) {
            const thisIndex = curIndex++
            const idx = arg.pathIndexes[thisIndex]
            const jump = arg.jumps[thisIndex]

            // console.log(`thisIndex = ${thisIndex}, pathIndexes.size = ${arg.pathIndexes.length}`)
            if (parentPath === undefined) {
                parentPath = Path.makeRootPath()
                root = parentNode = new MyNode()
                // console.log(`paths[${arg.pathIndexes[thisIndex]}] is parent. name = ${parentPath.getFullPathName()}`)
                if (thisIndex >= arg.pathIndexes.length) {
                    throw Error("yikes: Index exceeds pathIndexes.size()")
                }
                this._mynodes![idx] = parentNode
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
                    isPrimPropertyPath = true
                } else {
                    isPrimPropertyPath = false
                }
                // console.log(`tokenIndex = ${tokenIndex}, _tokens.size = ${this.tokens!.length}`)

                if (tokenIndex >= this.tokens!.length) {
                    throw Error(`Invalid tokenIndex in BuildDecompressedPathsImpl.`)
                }
                const elemToken = this.tokens![tokenIndex]
                // console.log(`path[${idx}] = ${parentPath._element} -> ${elemToken} (${parentNode?.name} -> ${elemToken})`)
                // const node = new MyNode(thisNode, elemToken)
                // console.log(`node ${parentNode?.name} add ${thisNode.name}`)
                if (this._mynodes![idx] !== undefined) {
                    throw Error("yikes")
                }
                this._mynodes![idx] = new MyNode(parentNode, elemToken, isPrimPropertyPath)
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
                parentNode = this._mynodes![idx] // reset parent path
            }
        }
        return root
    }
}

