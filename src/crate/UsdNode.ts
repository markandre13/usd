import { CrateDataType } from "./CrateDataType.ts"
import { CrateFile } from "./CrateFile.ts"
import { SpecType } from "./SpecType.ts"
import type { Tokens } from "./Tokens.ts"
import { ValueRep } from "./ValueRep.js"

// Prim
//   Attribute (is a property)

export interface UsdNodeSerializeArgs {
    tokens: Tokens
    thisIndex: number
    pathIndexes: number[]
    tokenIndexes: number[]
    jumps: number[]
}

export class UsdNode {
    crate: CrateFile
    parent?: UsdNode
    children: UsdNode[] = [];

    index: number
    spec_type?: SpecType
    fieldset_index?: number
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
    /**
     * encode node into the various sections of the crate
     */
    encode() {}
    getType(): SpecType {
        return this.spec_type!
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
    private fields?: Map<string, ValueRep>
    getFields() {
        if (this.fields) {
            return this.fields
        }
        this.fields = new Map<string, ValueRep>()
        this.crate.forEachField(this.fieldset_index!, (name, valueRep) => {
            this.fields!.set(name, valueRep)
        })
        return this.fields
    }
    getField(name: string): ValueRep | undefined {
        return this.getFields().get(name)
    }
    toJSON() {
        const result: any = {
            type: SpecType[this.getType()],
            name: this.name,
            prim: this.prim
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
    serialize(arg: UsdNodeSerializeArgs) {
        const hasChild = this.children.length > 0
        let hasSibling = false
        if (this.parent && this.parent.children.findIndex(it => it == this) < this.parent.children.length - 1) {
            hasSibling = true
        }
        let jump = 0
        if (!hasChild && !hasSibling) {
            jump = -2
        }
        if (hasChild && !hasSibling) {
            jump = -1
        }
        if (!hasChild && hasSibling) {
            jump = 0
        }
        if (hasChild && hasSibling) {
            // jump needs to be the position of the next sibling
            jump = this.children.length + 1
        }
        arg.pathIndexes[arg.thisIndex] = arg.thisIndex
        arg.tokenIndexes[arg.thisIndex] = arg.tokens.add(this.name)
        arg.jumps[arg.thisIndex] = jump
        // console.log(`[${arg.thisIndex}] := ${node.getFullPathName()}: hasChild = ${hasChild}, hasSibling=${hasSibling}, jump=${jump}`)
        for(const child of this.children) {
            ++arg.thisIndex
            child.serialize(arg)
        }
    }
}

    export class Mesh extends UsdNode {
        faceVertexIndices?: ArrayLike<number>
        faceVertexCounts?: ArrayLike<number>

        override serialize(arg: UsdNodeSerializeArgs) {
            super.serialize(arg)
            // if (this.faceVertexIndices) {
            //     out.writeIntArray("faceVertexIndices", this.faceVertexIndices)
            // }
            // if (this.faceVertexCounts) {
            //     out.writeIntArray("faceVertexCounts", this.faceVertexCounts)
            // }
        }
    }