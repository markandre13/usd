import { CrateDataType } from "./CrateDataType.ts"
import { CrateFile } from "./CrateFile.ts"
import { SpecType } from "./SpecType.ts"
import { ValueRep } from "./ValueRep.js"

// Prim
//   Attribute (is a property)

export class UsdNode {
    crate: CrateFile
    parent?: UsdNode
    children: UsdNode[] = [];

    index: number
    spec_index?: number
    name: string
    prim: boolean

    constructor(crate: CrateFile, parent: UsdNode | undefined, index: number, name: string, prim: boolean) {
        this.crate = crate
        this.parent = parent
        if (parent !== undefined) {
            parent.children.push(this)
        }
        this.index = index
        this.name = name
        this.prim = prim
    }
    getType(): SpecType {
        return this.crate._specs[this.spec_index!].spec_type
    }
    getFullPathName(): string {
        if (this.parent) {
            return `${this.parent.getFullPathName()}/${this.name}`
        }
        return ""
    }
    traverse(block: (node: UsdNode) => void) {
        block(this)
        for (const child of this.children) {
            child.traverse(block)
        }
    }
    print(indent: number = 0) {
        console.log(`${"  ".repeat(indent)} ${this.index} ${this.name}${this.prim ? " = ..." : ""} ${SpecType[this.getType()]}`)
        for (const child of this.children) {
            child.print(indent + 1)
        }
    }
    getChildPrim(name: string): UsdNode | undefined {
        for (const child of this.children) {
            if (child.getType() !== SpecType.Prim) {
                continue
            }
            if (child.name === name) {
                return child
            }
        }
        return undefined
    }
    getAttribute(name: string) {
        for (const child of this.children) {
            if (child.getType() !== SpecType.Attribute) {
                continue
            }
            if (child.name === name) {
                return child
            }
        }
        return undefined
    }
    getRelationship(name: string) {
        for (const child of this.children) {
            if (child.getType() !== SpecType.Relationship) {
                continue
            }
            if (child.name === name) {
                return child
            }
        }
        return undefined
    }
    foo() {
        const spec = this.crate._specs[this.spec_index!]
        console.log(SpecType[spec.spec_type])
        this.crate.ReconstructStageMeta(spec.fieldset_index)
    }
    private fields?: Map<string, ValueRep>
    getFields() {
        if (this.fields) {
            return this.fields
        }
        this.fields = new Map<string, ValueRep>()
        const spec = this.crate._specs[this.spec_index!]
        let fieldset_index = spec.fieldset_index
        for (; this.crate.fieldset_indices[fieldset_index] >= 0; ++fieldset_index) {
            const fieldIndex = this.crate.fieldset_indices[fieldset_index]
            const field = this.crate.fields[fieldIndex]
            const token = this.crate.tokens[field.tokenIndex]
            this.fields.set(token, field.valueRep)
        }
        return this.fields
    }
    getField(name: string): ValueRep | undefined {
        return this.getFields().get(name)
    }
    toJSON() {
        const result: any = {
            type: SpecType[this.getType()],
            name: this.name
        }

        const fields = this.getFields()
        if (fields.size > 0) {
            result.fields = {}
            for (const [key, value] of fields) {
                // const v = value.getValue(this.crate)
                // if (v === undefined) {
                //     console.log(`ValueRep.getValue(): for ${this.getFullPathName()}.${key} not implemented yet: type: ${CrateDataType[value.getType()]}, array: ${value.isArray()}, inline: ${value.isInlined()}, compressed: ${value.isCompressed()}`)
                //     // console.log(value.toString())
                // }
                result.fields[key] = value.toJSON(this, key)

                // {
                //     type: CrateDataType[value.getType()!],
                //     inline: value.isInlined(),
                //     array: value.isArray(),
                //     compressed: value.isCompressed(),
                //     value: v
                // }
            }
        }
        if (this.children.length > 0) {
            result.children = this.children.map(child => child.toJSON())
        }
        return result

    }
}
