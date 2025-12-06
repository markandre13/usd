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
import { Tokens } from "./Tokens.ts"
import { Fields } from "./Fields.ts"

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

        const tokens = new Tokens(reader, this.toc)
        this.tokens = tokens.tokens

        this.readStrings(reader)

        const fields = new Fields(reader, this.toc)
        this.fields = fields.fields!

        this.readFieldSets(reader)
        this.readPaths(reader)
        this.readSpecs(reader)

        for (let i = 0; i < this._nodes!.length; i++) {
            this._nodes[i].spec_index = this._specs[i].path_index
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

