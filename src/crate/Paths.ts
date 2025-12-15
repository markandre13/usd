import type { CrateFile } from "./CrateFile.ts"
import { Reader } from "./Reader.js"
import { SectionName } from "./SectionName.ts"
import type { Tokens } from "./Tokens.ts"
import { UsdNode, type UsdNodeSerializeArgs } from "./UsdNode.ts"
import type { Writer } from "./Writer.ts"



// the meaning of jump (maybe?)
// -2: has no child and no siblings
// -1: next is child, there are no siblings
//  0: no child, next is sibling
//  x: next is child, sibling at +x
export class Paths {
    _nodes: UsdNode[] = []

    num_nodes!: number
    pathIndexes!: number[]
    tokenIndexes!: number[]
    jumps!: number[]

    constructor(reader?: Reader) {
        if (reader instanceof Reader) {
            this.num_nodes = reader.getUint64()
            const numEncodedPaths = reader.getUint64()
            // console.log(`num_nodes = ${num_nodes}, numEncodedPaths=${numEncodedPaths}`)
            this.pathIndexes = reader.getCompressedIntegers(numEncodedPaths)
            this.tokenIndexes = reader.getCompressedIntegers(numEncodedPaths)
            this.jumps = reader.getCompressedIntegers(numEncodedPaths)

            // console.log('PATH READ')
            // console.log(`numNodes       : ${this.num_nodes}`)
            // console.log(`numEncodedPaths: ${numEncodedPaths}`)
            // console.log(`pathIndices    : ${this.pathIndexes}`)
            // console.log(`tokenIndexes   : ${this.tokenIndexes}`)
            // console.log(`jumps          : ${this.jumps}`)

            // for(let i=0; i<numEncodedPaths; ++i) {
            //     console.log(`[${i}] = token ${tokenIndexes[i]} ${crate?.tokens[tokenIndexes[i]]}, jump ${jumps[i]}`)
            // }
        }
    }

    encode(tokens: Tokens, root: UsdNode) {
        const numEncodedPaths = this._nodes.length

        this.pathIndexes = new Array<number>(numEncodedPaths)
        this.tokenIndexes = new Array<number>(numEncodedPaths)
        this.jumps = new Array<number>(numEncodedPaths)

        // TODO: do this earlier to fill up the tokens
        const arg: UsdNodeSerializeArgs = {
            tokens,
            thisIndex: 0,
            pathIndexes: this.pathIndexes,
            tokenIndexes: this.tokenIndexes,
            jumps: this.jumps
        }
        root.serialize(arg)
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

        writer.writeUint64(this._nodes.length) // number of nodes
        writer.writeUint64(this._nodes.length) // number of paths
        writer.writeCompressedIntWithoutSize(this.pathIndexes)
        writer.writeCompressedIntWithoutSize(this.tokenIndexes)
        writer.writeCompressedIntWithoutSize(this.jumps)
    }
}
