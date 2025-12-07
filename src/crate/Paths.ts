import type { CrateFile } from "./CrateFile.ts"
import type { Reader } from "./Reader.ts"
import { SectionName } from "./SectionName.ts"
import { UsdNode } from "./UsdNode.ts"

interface BuildNodeTreeArgs {
    pathIndexes: number[]
    elementTokenIndexes: number[]
    jumps: number[]
}

export class Paths {
    _nodes: UsdNode[] = []
    crate: CrateFile
    constructor(reader: Reader, crate: CrateFile) {
        this.crate = crate
        const section = crate.toc.sections.get(SectionName.PATHS)
        if (section === undefined) {
            return
        }
        reader.offset = section.start

        const num_nodes = reader.getUint64()
        const numEncodedPaths = reader.getUint64()
        const pathIndexes = reader.getCompressedIntegers(numEncodedPaths)
        const elementTokenIndexes = reader.getCompressedIntegers(numEncodedPaths)
        const jumps = reader.getCompressedIntegers(numEncodedPaths)

        this._nodes = new Array<UsdNode>(num_nodes)
        const node = this.buildNodeTree({
            pathIndexes,
            elementTokenIndexes,
            jumps
        })
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

            // console.log(`thisIndex = ${thisIndex}, pathIndexes.size = ${arg.pathIndexes.length}`)
            if (parentNode === undefined) {
                root = parentNode = new UsdNode(this.crate, undefined, idx, "/", true)
                // console.log(`paths[${arg.pathIndexes[thisIndex]}] is parent. name = ${parentPath.getFullPathName()}`)
                if (thisIndex >= arg.pathIndexes.length) {
                    throw Error("yikes: Index exceeds pathIndexes.size()")
                }
                this._nodes![idx] = parentNode
            } else {
                if (thisIndex >= arg.elementTokenIndexes.length) {
                    throw Error(`Index exceeds elementTokenIndexes.length`)
                }
                let tokenIndex = arg.elementTokenIndexes[thisIndex]
                let isPrimPropertyPath: boolean
                if (tokenIndex < 0) {
                    tokenIndex = -tokenIndex
                    isPrimPropertyPath = false
                } else {
                    isPrimPropertyPath = true
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
