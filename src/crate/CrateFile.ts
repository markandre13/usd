import { BootStrap } from "./BootStrap.ts"
import { Field } from "./Field.ts"
import { type StringIndex } from "../index.ts"
import type { Reader } from "./Reader.ts"
import { SectionName } from "./SectionName.ts"
import { TableOfContents } from "./TableOfContents.ts"
import { UsdNode } from "./UsdNode.ts"
import { SpecType } from "./SpecType.js"
import type { Spec } from "./Spec.ts"
import { Tokens } from "./Tokens.ts"
import { Fields } from "./Fields.ts"
import { Paths } from "./Paths.ts"

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
        const paths = new Paths(reader, this)
        this._nodes = paths._nodes
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
}

