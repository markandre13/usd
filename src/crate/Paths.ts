import type { Crate } from "./Crate"
import { Reader } from "./Reader.js"
import { SectionName } from "./SectionName"
import type { Tokens } from "./Tokens"
import { UsdNode, type UsdNodeSerializeArgs } from "../nodes/usd/UsdNode"
import type { Writer } from "./Writer"

export const JUMP_NO_CHILD_NO_SIBLINGS = -2
export const JUMP_NEXT_IS_CHILD_NO_SIBLINGS = -1
export const JUMP_NO_CHILD_NEXT_IS_SIBLING = 0
export const JUMP_NEXT_IS_CHILD_JUMP_TO_SIBLING = -99

export class Paths {
    _nodes!: UsdNode[]

    num_nodes!: number
    pathIndexes!: number[]
    tokenIndexes!: number[]
    jumps!: number[]

    constructor(reader?: Reader) {
        if (reader instanceof Reader) {
            this.num_nodes = reader.getUint64()
            const numEncodedPaths = reader.getUint64()

            // console.log(`Paths(reader): num_nodes = ${this.num_nodes}, numEncodedPaths = ${numEncodedPaths}`)

            this.pathIndexes = reader.getCompressedIntegers(numEncodedPaths)
            this.tokenIndexes = reader.getCompressedIntegers(numEncodedPaths)
            this.jumps = reader.getCompressedIntegers(numEncodedPaths)
        }
    }

    encode(tokens: Tokens, root: UsdNode) {
        this._nodes = new Array(root.numberOfNodes())

        const numEncodedPaths = this._nodes.length
        // console.log(`numEncodedPaths = ${numEncodedPaths}`)

        this.pathIndexes = new Array<number>(numEncodedPaths)
        this.tokenIndexes = new Array<number>(numEncodedPaths)
        this.jumps = new Array<number>(numEncodedPaths)

        // TODO: do this earlier to fill up the tokens
        const arg: UsdNodeSerializeArgs = {
            tokens,
            thisIndex: 0,
            pathIndexes: this.pathIndexes,
            tokenIndexes: this.tokenIndexes,
            jumps: this.jumps,
            depth: 0
        }

        root.flatten(arg)
        // this.print()
    }

    serialize(writer: Writer) {
        // for(let i=0; i<numEncodedPaths; ++i) {
        //     const n = this._nodes[i]
        //     console.log(`[${i}] = token ${arg.tokenIndexes[i]} ${n.name}, jump ${arg.jumps[i]}`)
        // }

        // console.log('PATH WRITE')
        // console.log(`numNodes       : ${this._nodes.length}`)
        // console.log(`numEncodedPaths: ${numEncodedPaths}`)
        // console.log(`pathIndices    : ${arg.pathIndexes}`)
        // console.log(`tokenIndexes   : ${arg.tokenIndexes}`)
        // console.log(`jumps          : ${arg.jumps}`)

        writer.writeUint64(this._nodes!.length) // number of nodes
        writer.writeUint64(this._nodes!.length) // number of paths
        writer.writeCompressedIntWithoutSize(this.pathIndexes)
        writer.writeCompressedIntWithoutSize(this.tokenIndexes)
        writer.writeCompressedIntWithoutSize(this.jumps)
    }
}
