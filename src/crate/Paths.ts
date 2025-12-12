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
    _nodes!: UsdNode[]
    crate!: CrateFile

    num_nodes!: number
    pathIndexes!: number[]
    tokenIndexes!: number[]
    jumps!: number[]

    constructor(reader?: Reader, crate?: CrateFile) {
        if (reader instanceof Reader) {
            this.crate = crate!
            const section = crate!.toc.sections.get(SectionName.PATHS)
            if (section === undefined) {
                return
            }
            reader.offset = section.start

            this.num_nodes = reader.getUint64()
            const numEncodedPaths = reader.getUint64()
            // console.log(`num_nodes = ${num_nodes}, numEncodedPaths=${numEncodedPaths}`)
            this.pathIndexes = reader.getCompressedIntegers(numEncodedPaths)
            this.tokenIndexes = reader.getCompressedIntegers(numEncodedPaths)
            this.jumps = reader.getCompressedIntegers(numEncodedPaths)

            // console.log(`pathIndices : ${pathIndexes}`)
            // console.log(`tokenIndexes: ${tokenIndexes}`)
            // console.log(`jumps       : ${jumps}`)

            // for(let i=0; i<numEncodedPaths; ++i) {
            //     console.log(`[${i}] = token ${tokenIndexes[i]} ${crate?.tokens[tokenIndexes[i]]}, jump ${jumps[i]}`)
            // }
        } else {

        }
    }

    serialize(writer: Writer, tokens: Tokens) {
        const numEncodedPaths = this._nodes.length
        const arg: UsdNodeSerializeArgs = {
            tokens,
            thisIndex: 0,
            pathIndexes: new Array<number>(numEncodedPaths),
            tokenIndexes : new Array<number>(numEncodedPaths),
            jumps : new Array<number>(numEncodedPaths)
        }
        this._nodes[0].serialize(arg)

        // for(let i=0; i<numEncodedPaths; ++i) {
        //     const n = this._nodes[i]
        //     console.log(`[${i}] = token ${arg.tokenIndexes[i]} ${n.name}, jump ${arg.jumps[i]}`)
        // }

        writer.writeUint64(this._nodes.length) // number of nodes
        writer.writeUint64(this._nodes.length) // number of paths
        writer.writeCompressedIntWithoutSize(arg.pathIndexes)
        writer.writeCompressedIntWithoutSize(arg.tokenIndexes)
        writer.writeCompressedIntWithoutSize(arg.jumps)
    }
}
