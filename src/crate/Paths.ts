import type { CrateFile } from "./CrateFile.ts"
import { Reader } from "./Reader.js"
import { SectionName } from "./SectionName.ts"
import { UsdNode } from "./UsdNode.ts"
import type { Writer } from "./Writer.ts"

interface BuildNodeTreeArgs {
    pathIndexes: number[]
    elementTokenIndexes: number[]
    jumps: number[]
}

export class Paths {
    _nodes!: UsdNode[]
    crate!: CrateFile
    constructor(reader?: Reader, crate?: CrateFile) {
        if (reader instanceof Reader) {
            this.crate = crate!
            const section = crate!.toc.sections.get(SectionName.PATHS)
            if (section === undefined) {
                return
            }
            reader.offset = section.start

            const num_nodes = reader.getUint64()
            const numEncodedPaths = reader.getUint64()
            console.log(`num_nodes = ${num_nodes}, numEncodedPaths=${numEncodedPaths}`)
            const pathIndexes = reader.getCompressedIntegers(numEncodedPaths)
            const tokenIndexes = reader.getCompressedIntegers(numEncodedPaths)
            const jumps = reader.getCompressedIntegers(numEncodedPaths)


            console.log(`pathIndices : ${pathIndexes}`)
            console.log(`tokenIndexes: ${tokenIndexes}`)
            console.log(`jumps       : ${jumps}`)

            this._nodes = new Array<UsdNode>(num_nodes)
            const node = this.buildNodeTree({
                pathIndexes,
                elementTokenIndexes: tokenIndexes,
                jumps
            })
        } else {

        }
    }

    serialize(writer: Writer) {
        writer.writeUint64(this._nodes.length) // number of nodes
        writer.writeUint64(this._nodes.length) // number of paths
        writer.writeCompressedIntWithoutSize([0])
        writer.writeCompressedIntWithoutSize([0])
        writer.writeCompressedIntWithoutSize([0])
        // path indices
        // element token indices
        // jumps
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
                let tokenIndex = arg.elementTokenIndexes[thisIndex]
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
                root = parentNode = new UsdNode(this.crate, undefined, idx, "/", true)
                this._nodes![idx] = parentNode
            } else {
                if (thisIndex >= arg.elementTokenIndexes.length) {
                    throw Error(`Index exceeds elementTokenIndexes.length`)
                }

                // console.log(`tokenIndex = ${tokenIndex}, _tokens.size = ${this.tokens!.length}`)
                if (tokenIndex >= this.crate.tokens!.length) {
                    throw Error(`Invalid tokenIndex in BuildDecompressedPathsImpl.`)
                }
                const elemToken = this.crate.tokens![tokenIndex]
                if (this._nodes![idx] !== undefined) {
                    throw Error("yikes")
                }
                this._nodes![idx] = new UsdNode(this.crate, parentNode, idx, elemToken, isPrimPropertyPath)
            }
            console.log(`${this._nodes![idx].getFullPathName()}: thisIndex=${thisIndex}, idx=${idx}, jump=${jump}, token=${tokenIndex} (${this.crate.tokens[tokenIndex]})`)

            // the meaning of jump (maybe?)
            // -2: has no child and no siblings
            // -1: next is child, there are no siblings
            //  0: no child, next is sibling
            //  x: next is child, sibling at +x

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
