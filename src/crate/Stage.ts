import { Crate } from "./Crate.js"
import { Reader } from "./Reader"
import type { UsdNode } from "./UsdNode"

export class Stage {
    _crate!: Crate
    constructor(buffer?: Buffer) {
        if (buffer) {
            const data = new DataView(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
            const reader = new Reader(data)
            this._crate = new Crate(reader)
        }
    }
    getPrimAtPath(path: string) {
        if (path[0] !== '/') {
            throw Error('only absolute paths are implemented')
        }
        const pathSegments = path.split('/').splice(1)
        // console.log(`TRAVERSE %o (${path})`, s)
        let parent: UsdNode | undefined
        let node: UsdNode | undefined = this._crate.paths._nodes[0]
        for (const segment of pathSegments) {
            if (node === undefined) {
                break
            }
            if (segment.length === 0) {
                break
            }
            parent = node
            node = node.getChildPrim(segment)
        }
        if (node == undefined) {
            throw Error(`path '${path}' not found. At ${parent?.getFullPathName()} available children are ${parent?.children.map(it => it.name).join(", ")}`)
        }
        return node
    }
}
