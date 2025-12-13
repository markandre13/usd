import { BootStrap } from "./BootStrap.ts"
import { Field } from "./Field.ts"
import { type StringIndex } from "../index.ts"
import type { Reader } from "./Reader.ts"
import { TableOfContents } from "./TableOfContents.ts"
import { UsdNode } from "./UsdNode.ts"
import { Tokens } from "./Tokens.ts"
import { Fields } from "./Fields.ts"
import { Paths } from "./Paths.ts"
import { Specs } from "./Specs.ts"
import { FieldSets } from "./FieldSets.ts"
import { Strings } from "./Strings.ts"
import type { ValueRep } from "./ValueRep.ts"
import { SectionName } from "./SectionName.ts"

interface BuildNodeTreeArgs {
    pathIndexes: number[]
    tokenIndexes: number[]
    jumps: number[]
}

export class CrateFile {
    bootstrap: BootStrap
    toc: TableOfContents
    tokens: Tokens
    strings: Strings
    fields: Fields
    fieldsets: FieldSets
    paths: Paths
    specs: Specs

    // tokens!: string[]
    // strings!: StringIndex[]
    // fields!: Field[]
    // fieldset_indices!: number[]
    _nodes!: UsdNode[]

    reader: Reader

    constructor(reader: Reader) {
        this.reader = reader
        this.bootstrap = new BootStrap(reader)
        this.bootstrap.seekTOC()
        this.toc = new TableOfContents(reader)
        this.toc.seek(SectionName.TOKENS)
        this.tokens = new Tokens(reader)
        this.toc.seek(SectionName.STRINGS)
        this.strings = new Strings(reader)
        this.toc.seek(SectionName.FIELDS)
        this.fields = new Fields(reader)
        this.toc.seek(SectionName.FIELDSETS)
        this.fieldsets = new FieldSets(reader)
        this.toc.seek(SectionName.PATHS)
        this.paths = new Paths(reader)
        this.toc.seek(SectionName.SPECS)
        this.specs = new Specs(reader)

        // build node tree
        this._nodes = new Array<UsdNode>(this.paths.num_nodes)
        const node = this.buildNodeTree({
            pathIndexes: this.paths.pathIndexes,
            tokenIndexes: this.paths.tokenIndexes,
            jumps: this.paths.jumps
        })
        // move this into buildNodeTree so that we can directly instantiate classes like Xform, Mesh, ...
        for (let i = 0; i < this.specs.pathIndexes.length; ++i) {
            const idx = this.specs.pathIndexes[i]
            this._nodes[i].fieldset_index = this.specs.fieldsetIndexes[idx]
            this._nodes[i].spec_type = this.specs.specTypeIndexes[idx]
        }
    }

    forEachField(fieldSetIndex: number, block: (name: string, value: ValueRep) => void) {
        for (let i = fieldSetIndex; this.fieldsets.fieldset_indices[i] >= 0; ++i) {
            const fieldIndex = this.fieldsets.fieldset_indices[i]
            const field = this.fields.fields![fieldIndex]
            const token = this.tokens.get(field.tokenIndex)
            block(token, field.valueRep)
        }
    }

    private buildNodeTree(
        arg: BuildNodeTreeArgs,
        parentNode: UsdNode | undefined = undefined,
        curIndex: number = 0
    ) {
        let hasChild = true, hasSibling = true
        let root: UsdNode | undefined
        while (hasChild || hasSibling) {
            const thisIndex = curIndex++
            const idx = arg.pathIndexes[thisIndex]
            const jump = arg.jumps[thisIndex]
            let tokenIndex = arg.tokenIndexes[thisIndex]
            let isPrimPropertyPath: boolean
            if (tokenIndex < 0) {
                tokenIndex = -tokenIndex
                isPrimPropertyPath = false
            } else {
                isPrimPropertyPath = true
            }

            // console.log(`thisIndex = ${thisIndex}, pathIndexes.size = ${arg.pathIndexes.length}`)
            if (parentNode === undefined) {
                if (thisIndex >= arg.pathIndexes.length) {
                    throw Error("yikes: Index exceeds pathIndexes.size()")
                }
                root = parentNode = new UsdNode(this, undefined, idx, "/", true)
                this._nodes![idx] = parentNode
            } else {
                if (thisIndex >= arg.tokenIndexes.length) {
                    throw Error(`Index exceeds elementTokenIndexes.length`)
                }

                // console.log(`tokenIndex = ${tokenIndex}, _tokens.size = ${this.tokens!.length}`)
                const elemToken = this.tokens.get(tokenIndex)
                if (this._nodes![idx] !== undefined) {
                    throw Error(`yikes: node[${idx}] is already set`)
                }
                this._nodes![idx] = new UsdNode(this, parentNode, idx, elemToken, isPrimPropertyPath)
            }
            // console.log(`${this._nodes![idx].getFullPathName()}: thisIndex=${thisIndex}, idx=${idx}, jump=${jump}, token=${tokenIndex} (${this.crate.tokens[tokenIndex]})`)
            // if (this.tokens[tokenIndex] === undefined) {
            //     console.log(`BUMMER at tokenIndex ${tokenIndex}`)
            //     console.log(this.tokens)
            // }

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

