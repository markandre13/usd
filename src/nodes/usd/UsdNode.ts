import { CrateDataType } from "../../crate/CrateDataType"
import { Crate } from "../../crate/Crate"
import { isPrim, SpecType } from "../../crate/SpecType"
import type { Tokens } from "../../crate/Tokens"
import { TimeSamples, ValueRep } from "../../crate/ValueRep.js"
import { JUMP_NEXT_IS_CHILD_JUMP_TO_SIBLING, JUMP_NEXT_IS_CHILD_NO_SIBLINGS, JUMP_NO_CHILD_NEXT_IS_SIBLING, JUMP_NO_CHILD_NO_SIBLINGS } from "../../crate/Paths"
import type { Specifier } from "../../crate/Specifier"
import type { ListOp } from "../../crate/ListOp"
import type { Variability } from "../../crate/Variability"
import { UserInfo } from "node:os"

// Prim
//   Attribute (is a property)

export interface UsdNodeSerializeArgs {
    tokens: Tokens
    thisIndex: number
    pathIndexes: number[]
    tokenIndexes: number[]
    jumps: number[],
    depth: number
}

/**
 * USD stores it's data in a tree of UsdNodes.
 * 
 * - a node has fields encoded as ValueReps
 * - 
 */
export class UsdNode {
    crate: Crate
    parent?: UsdNode
    children: UsdNode[] = [];
    depth?: number

    // use -1 when the index is yet unknown
    index: number
    spec_type?: SpecType
    fieldset_index?: number
    name: string
    prim: boolean

    constructor(crate: Crate, parent: UsdNode | undefined, index: number, name: string, prim: boolean) {
        if (name.length === 0) {
            throw Error(`UsdNode must not have an empty name`)
        }
        if (name != "/" && name.indexOf("/") >= 0) {
            throw Error(`UsdNode '${name}' contains reserved character '/'`)
        }
        if (name.indexOf(".") >= 0) {
            throw Error(`UsdNode '${name}' contains reserved character '.'`)
        }
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
    encode() {
        const crate = this.crate
        // this.index = crate.paths._nodes.length
        // crate.paths._nodes.push(this)

        crate.specs.pathIndexes.push(this.index)
        crate.specs.specTypeIndexes.push(this.spec_type!)
        crate.specs.fieldsetIndexes.push(crate.fieldsets.fieldset_indices.length)
        this.encodeFields()
        crate.fieldsets.fieldset_indices.push(-1)

        for (const child of this.children) {
            child.encode()
        }
    }
    encodeFields() {
        this.setTokenVector("properties", this.children.filter(it => !isPrim(it.getType())).map(it => it.name))
        this.setTokenVector("primChildren", this.children.filter(it => isPrim(it.getType())).map(it => it.name))
    }
    deleteChild(name: string): void {
        for (let i = 0; i < this.children.length; ++i) {
            if (this.children[i].name === name) {
                this.children.splice(i, 1)
                break
            }
        }
    }
    findChild(name: string): UsdNode | undefined {
        for (let i = 0; i < this.children.length; ++i) {
            if (this.children[i].name === name) {
                return this.children[i]
            }
        }
        return undefined
    }
    numberOfNodes(): number {
        let n = 1
        for (const child of this.children) {
            n += child.numberOfNodes()
        }
        return n
    }

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
    flatten(arg: UsdNodeSerializeArgs) {
        this.depth = arg.depth
        this.index = arg.thisIndex
        this.crate.paths._nodes[this.index] = this
        const thisIndex = arg.thisIndex
        const hasChild = this.children.length > 0
        let hasSibling = false
        if (this.parent && this.parent.children.findIndex(it => it == this) < this.parent.children.length - 1) {
            hasSibling = true
        }

        let jump = 0
        if (!hasChild && !hasSibling) {
            jump = JUMP_NO_CHILD_NO_SIBLINGS
        }
        if (hasChild && !hasSibling) {
            jump = JUMP_NEXT_IS_CHILD_NO_SIBLINGS
        }
        if (!hasChild && hasSibling) {
            jump = JUMP_NO_CHILD_NEXT_IS_SIBLING
        }
        if (hasChild && hasSibling) {
            // jump needs to be the position of the next sibling
            // jump = this.children.length + 1 // FIXME: my children and childrens children
            jump = JUMP_NEXT_IS_CHILD_JUMP_TO_SIBLING
        }
        arg.pathIndexes[arg.thisIndex] = arg.thisIndex

        let tokenIndex = arg.tokens.add(this.name)
        if (!isPrim(this.spec_type!)) {
            tokenIndex = -tokenIndex
        }
        arg.tokenIndexes[arg.thisIndex] = tokenIndex

        arg.jumps[arg.thisIndex] = jump
        // console.log(`[${arg.thisIndex}] := ${"  ".repeat(arg.depth)}${this.name}: hasChild = ${hasChild}, hasSibling=${hasSibling}, jump=${jumpName}`)
        for (const child of this.children) {
            ++arg.thisIndex
            ++arg.depth
            child.flatten(arg)
            --arg.depth
        }
        if (jump === JUMP_NEXT_IS_CHILD_JUMP_TO_SIBLING) {
            arg.jumps[thisIndex] = arg.thisIndex - thisIndex + 1
            // console.log(`jump[${thisIndex}] to ${arg.thisIndex + 1} by ${arg.thisIndex - thisIndex + 1}`)
        }
    }

    setBoolean(name: string, value?: boolean) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setBoolean(name, value)
            )
        }
    }
    setInt(name: string, value?: number) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setInt(name, value)
            )
        }
    }
    setIntArray(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setIntArray(name, value)
            )
        }
    }
    setFloat(name: string, value?: number) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setFloat(name, value)
            )
        }
    }

    setVec2h(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setVec2h(name, value)
            )
        }
    }
    setVec3h(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setVec3h(name, value)
            )
        }
    }
    setVec4h(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setVec4h(name, value)
            )
        }
    }
    setVec3hArray(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setVec3hArray(name, value)
            )
        }
    }

    setVec2f(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setVec2f(name, value)
            )
        }
    }
    setVec3f(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setVec3f(name, value)
            )
        }
    }
    setVec4f(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setVec4f(name, value)
            )
        }
    }

    setVec3fArray(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setVec3fArray(name, value)
            )
        }
    }

    setVec2d(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setVec2d(name, value)
            )
        }
    }
    setVec3d(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setVec3d(name, value)
            )
        }
    }
    setVec4d(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setVec4d(name, value)
            )
        }
    }


    setMatrix4d(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setMatrix4d(name, value)
            )
        }
    }
    setMatrix4dArray(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setMatrix4dArray(name, value)
            )
        }
    }
    setQuatfArray(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setQuatfArray(name, value)
            )
        }
    }
    setFloatArray(name: string, value?: ArrayLike<number>) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setFloatArray(name, value)
            )
        }
    }
    setTimeSamples(name: string, value?: TimeSamples) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setTimeSamples(name, value)
            )
        }
    }
    setDouble(name: string, value?: number) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setDouble(name, value)
            )
        }
    }
    setString(name: string, value?: string) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setString(name, value)
            )
        }
    }
    setSpecifier(name: string, value?: Specifier) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setSpecifier(name, value)
            )
        }
    }
    setVariability(name: string, value?: Variability) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setVariability(name, value)
            )
        }
    }
    setToken(name: string, value?: string) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setToken(name, value)
            )
        }
    }
    setTokenArray(name: string, value?: string[]) {
        if (value && value.length > 0) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setTokenArray(name, value)
            )
        }
    }
    setTokenVector(name: string, value?: string[]) {
        if (value && value.length > 0) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setTokenVector(name, value)
            )
        }
    }
    setAssetPath(name: string, value?: string) {
        if (value) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setAssetPath(name, value)
            )
        }
    }
    setPathListOp(name: string, value?: ListOp<UsdNode>) {
        if (value) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setPathListOp(name, value)
            )
        }
    }
    setTokenListOp(name: string, value?: ListOp<string>) {
        if (value) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setTokenListOp("apiSchemas", value)
            )
        }
    }
    setCustomData(name: string, value?: any) {
        if (value !== undefined) {
            this.crate.fieldsets.fieldset_indices.push(
                this.crate.fields.setDictionary(name, value)
            )
        }
    }
}