import { BootStrap } from "./BootStrap.ts"
import { Field } from "./Field.ts"
import { decompressFromBuffer, readCompressedInts, decodeIntegers, type StringIndex } from "../index.ts"
import { Node, Path } from "../path/Path.ts"
import type { Reader } from "./Reader.ts"
import { SectionName } from "./SectionName.ts"
import { TableOfContents } from "./TableOfContents.ts"
import { ValueRep } from "./ValueRep.ts"

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

    tokens?: string[]
    strings?: StringIndex[]
    fields?: Field[]
    fieldset_indices?: number[]
    // paths is the 3 following data structures?
    _paths?: Path[]
    // _elemPaths?: Path[]
    // _nodes?: Node[]

    // specs
    constructor(reader: Reader) {
        this.bootstrap = new BootStrap(reader)
        reader.offset = this.bootstrap.tocOffset
        this.toc = new TableOfContents(reader)
        this.readTokens(reader)
        this.readStrings(reader)
        this.readFields(reader)
        this.readFieldSets(reader)
        this.readPaths(reader)
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

    // bool CrateReader::ReadPaths()
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    // num_paths	: read uint64_t

    // _paths		: Path[num_paths]
    // _elemPaths	: Path[num_paths]
    // _nodes		: Node[num_paths]
    // call:

    // bool CrateReader::ReadCompressedPaths(const uint64_t maxNumPaths = num_paths)
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // type index = uint64_t
    // numEncodedPaths    := read uint64_t
    // pathIndexes         := read index[numEncodedPaths] ;; index in _paths
    // elementTokenIndexes := read index[numEncodedPaths] ;; index in _tokens, when < 0, value is a prim property path
    // jumps               := index[numEncodedPaths]
    // visit_table	: bool[maxNumPaths]
    // call:

    // bool CrateReader::BuildDecompressedPathsImpl(BuildDecompressedPathsArg *arg)
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // hasChild = hasSibling = true
    // while(hasChild || hasSibling)
    //   for(thisIndex in startIndex..endIndex)
    //     idx = pathIndexes[thisIndex];
    //     jump = jumps[thisIndex]

    //     if (!parentPath)
    //       _paths[idx] = parentPath = rootPath = Path::make_root_path()
    //     else
    //       tokenIndex = elementTokenIndexes[thisIndex];
    //       isPrimPropertyPath = false
    //       if (tokenIndex<0) {
    //       	tokenIndex = -tokenIndex
    //       	isPrimPropertyPath = true
    //       }
    //       elemToken = _tokens[tokenIndex];
    //       _paths[idx] =
    //             isPrimPropertyPath ? parentPath.AppendProperty(elemToken)
    //                                : parentPath.AppendElement(elemToken)
    //       _elemPaths[idx] = Path(elemToken, "");

    //       bool hasChild = jump > 0 || jump == -1
    //       bool hasSibling = jump >= 0

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
        this.BuildDecompressedPathsImpl(arg)

        // print paths

        // TODO:
        // Ensure decoded numEncodedPaths.
        // // Now build node hierarchy.
    }

    private BuildDecompressedPathsImpl(arg: BuildDecompressedPathsArg, parentPath: Path | undefined = undefined, curIndex: number = 0) {
        let hasChild = true, hasSibling = true
        while (hasChild || hasSibling) {
            const thisIndex = curIndex++
            const idx = arg.pathIndexes[thisIndex]
            const jump = arg.jumps[thisIndex]

            console.log(`thisIndex = ${thisIndex}, pathIndexes.size = ${arg.pathIndexes.length}`)
            if (parentPath === undefined) {
                parentPath = Path.makeRootPath()
                console.log(`paths[${arg.pathIndexes[thisIndex]}] is parent. name = ${parentPath.getFullPathName()}`)
                if (thisIndex >= arg.pathIndexes.length) {
                    throw Error("yikes: Index exceeds pathIndexes.size()")
                }
                this._paths![idx] = parentPath
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
                console.log(`tokenIndex = ${tokenIndex}, _tokens.size = ${this.tokens!.length}`)

                if (tokenIndex >= this.tokens!.length) {
                    throw Error(`Invalid tokenIndex in BuildDecompressedPathsImpl.`)
                }
                const elemToken = this.tokens![tokenIndex]
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
                    this.BuildDecompressedPathsImpl(arg, parentPath, siblingIndex)
                }
                parentPath = this._paths![idx] // reset parent path
            }
        }
    }
}

