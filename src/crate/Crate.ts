import { BootStrap } from "./BootStrap.ts"
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
import { Writer } from "./Writer.ts"
import { Section } from "./Section.ts"

interface BuildNodeTreeArgs {
    pathIndexes: number[]
    tokenIndexes: number[]
    jumps: number[]
}

export class Crate {
    bootstrap: BootStrap
    toc: TableOfContents
    tokens: Tokens
    strings: Strings
    fields: Fields
    fieldsets: FieldSets
    paths: Paths
    specs: Specs

    reader!: Reader
    writer!: Writer

    constructor(reader?: Reader) {
        if (reader) {
            this.reader = reader
            this.bootstrap = new BootStrap(reader)
            this.bootstrap.seekTOC()
            this.toc = new TableOfContents(reader)
            this.toc.seek(SectionName.TOKENS)
            this.tokens = new Tokens(reader)
            this.toc.seek(SectionName.STRINGS)
            this.strings = new Strings(reader, this.tokens)
            this.toc.seek(SectionName.FIELDS)
            this.fields = new Fields(reader)
            this.toc.seek(SectionName.FIELDSETS)
            this.fieldsets = new FieldSets(reader)
            this.toc.seek(SectionName.PATHS)
            this.paths = new Paths(reader)
            this.toc.seek(SectionName.SPECS)
            this.specs = new Specs(reader)

            // build node tree
            this.paths._nodes = new Array<UsdNode>(this.paths.num_nodes)
            const node = this.buildNodeTree({
                pathIndexes: this.paths.pathIndexes,
                tokenIndexes: this.paths.tokenIndexes,
                jumps: this.paths.jumps
            })
            // move this into buildNodeTree so that we can directly instantiate classes like Xform, Mesh, ...
            for (let i = 0; i < this.specs.pathIndexes.length; ++i) {
                const idx = this.specs.pathIndexes[i]
                this.paths._nodes[i].fieldset_index = this.specs.fieldsetIndexes[idx]
                this.paths._nodes[i].spec_type = this.specs.specTypeIndexes[idx]
            }
        } else {
            this.writer = new Writer(undefined, "data    ")
            this.bootstrap = new BootStrap()
            this.toc = new TableOfContents()
            this.tokens = new Tokens()
            this.strings = new Strings(this.tokens)
            this.fields = new Fields(this.tokens, this.strings, this.writer)
            this.fieldsets = new FieldSets()
            this.paths = new Paths()
            this.specs = new Specs()
        }
    }

    serialize(root: UsdNode) {
        this.strings.add(";-)") // this seems to be by convention

        const writer = this.writer
        this.bootstrap.skip(writer) // leave room for bootstrap
        root.encode()
        this.paths.encode(this.tokens, root)

        // WRITE SECTIONS

        let start: number, size: number

        start = writer.tell()
        this.tokens.serialize(writer)
        size = writer.tell() - start
        this.toc.addSection(new Section({ name: SectionName.TOKENS, start, size }))

        start = writer.tell()
        this.strings.serialize(writer)
        size = writer.tell() - start
        this.toc.addSection(new Section({ name: SectionName.STRINGS, start, size }))

        start = writer.tell()
        this.fields.serialize(writer)
        size = writer.tell() - start
        this.toc.addSection(new Section({ name: SectionName.FIELDS, start, size }))

        start = writer.tell()
        this.fieldsets.serialize(writer)
        size = writer.tell() - start
        this.toc.addSection(new Section({ name: SectionName.FIELDSETS, start, size }))

        start = writer.tell()
        this.paths.serialize(writer)
        size = writer.tell() - start
        this.toc.addSection(new Section({ name: SectionName.PATHS, start, size }))

        start = writer.tell()
        this.specs.serialize(writer)
        size = writer.tell() - start
        this.toc.addSection(new Section({ name: SectionName.SPECS, start, size }))

        start = writer.tell()
        this.toc.serialize(writer)

        writer.seek(0)
        this.bootstrap.tocOffset = start
        this.bootstrap.serialize(writer)
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
                this.paths._nodes![idx] = parentNode
            } else {
                if (thisIndex >= arg.tokenIndexes.length) {
                    throw Error(`Index ${thisIndex} exceeds tokenIndexes.length = ${arg.tokenIndexes.length}`)
                }
                // console.log(`tokenIndex = ${tokenIndex}, _tokens.size = ${this.tokens!.length}`)
                const elemToken = this.tokens.get(tokenIndex)
                if (this.paths._nodes![idx] !== undefined) {
                    throw Error(`yikes: node[${idx}] is already set`)
                }
                this.paths._nodes![idx] = new UsdNode(this, parentNode, idx, elemToken, isPrimPropertyPath)
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
                parentNode = this.paths._nodes![idx] // reset parent path
            }
        }
        return root
    }

}

