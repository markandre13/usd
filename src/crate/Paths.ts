import type { CrateFile } from "./CrateFile.ts"
import { Reader } from "./Reader.js"
import { SectionName } from "./SectionName.ts"
import type { Tokens } from "./Tokens.ts"
import { UsdNode } from "./UsdNode.ts"
import type { Writer } from "./Writer.ts"

interface BuildNodeTreeArgs {
    pathIndexes: number[]
    tokenIndexes: number[]
    jumps: number[]
}

interface BuildNodeTreeArgs2 {
    thisIndex: number
    pathIndexes: number[]
    tokenIndexes: number[]
    jumps: number[]
}

// the meaning of jump (maybe?)
// -2: has no child and no siblings
// -1: next is child, there are no siblings
//  0: no child, next is sibling
//  x: next is child, sibling at +x
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
            // console.log(`num_nodes = ${num_nodes}, numEncodedPaths=${numEncodedPaths}`)
            const pathIndexes = reader.getCompressedIntegers(numEncodedPaths)
            const tokenIndexes = reader.getCompressedIntegers(numEncodedPaths)
            const jumps = reader.getCompressedIntegers(numEncodedPaths)

            // console.log(`pathIndices : ${pathIndexes}`)
            // console.log(`tokenIndexes: ${tokenIndexes}`)
            // console.log(`jumps       : ${jumps}`)

            // for(let i=0; i<numEncodedPaths; ++i) {
            //     console.log(`[${i}] = token ${tokenIndexes[i]} ${crate?.tokens[tokenIndexes[i]]}, jump ${jumps[i]}`)
            // }

            this._nodes = new Array<UsdNode>(num_nodes)
            const node = this.buildNodeTree({
                pathIndexes,
                tokenIndexes: tokenIndexes,
                jumps
            })
        } else {

        }
    }

    serialize(writer: Writer, tokens: Tokens) {
        const numEncodedPaths = this._nodes.length
        const arg: BuildNodeTreeArgs2 = {
            thisIndex: 0,
            pathIndexes: new Array<number>(numEncodedPaths),
            tokenIndexes : new Array<number>(numEncodedPaths),
            jumps : new Array<number>(numEncodedPaths)
        }
        this.dump(this._nodes[0], arg, tokens)

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

    private dump(node: UsdNode, arg: BuildNodeTreeArgs2, tokens: Tokens) {
        const hasChild = node.children.length > 0
        let hasSibling = false
        if (node.parent && node.parent.children.findIndex(it => it == node) < node.parent.children.length - 1) {
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
            jump = node.children.length + 1
        }
        arg.pathIndexes[arg.thisIndex] = arg.thisIndex
        arg.tokenIndexes[arg.thisIndex] = tokens.add(node.name)
        arg.jumps[arg.thisIndex] = jump
        // console.log(`[${arg.thisIndex}] := ${node.getFullPathName()}: hasChild = ${hasChild}, hasSibling=${hasSibling}, jump=${jump}`)
        for(const child of node.children) {
            ++arg.thisIndex
            this.dump(child, arg, tokens)
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
                root = parentNode = new UsdNode(this.crate, undefined, idx, "/", true)
                this._nodes![idx] = parentNode
            } else {
                if (thisIndex >= arg.tokenIndexes.length) {
                    throw Error(`Index exceeds elementTokenIndexes.length`)
                }

                // console.log(`tokenIndex = ${tokenIndex}, _tokens.size = ${this.tokens!.length}`)
                if (tokenIndex >= this.crate.tokens!.length) {
                    throw Error(`Invalid tokenIndex in BuildDecompressedPathsImpl.`)
                }
                const elemToken = this.crate.tokens![tokenIndex]
                if (this._nodes![idx] !== undefined) {
                    throw Error(`yikes: node[${idx}] is already set`)
                }
                this._nodes![idx] = new UsdNode(this.crate, parentNode, idx, elemToken, isPrimPropertyPath)
            }
            // console.log(`${this._nodes![idx].getFullPathName()}: thisIndex=${thisIndex}, idx=${idx}, jump=${jump}, token=${tokenIndex} (${this.crate.tokens[tokenIndex]})`)
            if (this.crate.tokens[tokenIndex] === undefined) {
                console.log(`BUMMER at tokenIndex ${tokenIndex}`)
                console.log(this.crate.tokens)
            }

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
