import { CrateDataType } from "./CrateDataType.ts"

enum Axis {
    X, Y, Z
}

class PseudoRoot {
    metersPerUnit?: number
    documentation?: string
    upAxis?: Axis
}

export namespace UsdGeom {
    export class SchemaBase {
        serialize(out: Writer): void { }
    }
    export class Typed extends SchemaBase { }
    export class Imageable extends Typed {
        constructor() {
            super()
        }
    }
    export class Xformable extends Imageable {
        constructor() {
            super()
        }
    }
    export class Xform extends Xformable {
        constructor() {
            super()
        }
    }
    export class Boundable extends Xformable { }
    export class Gprim extends Boundable { }
    export class PointBased extends Gprim {
        points?: ArrayLike<number>
        normals?: ArrayLike<number>
        override serialize(out: Writer): void {
            super.serialize(out)
            if (this.points) {
                out.writePoint3fArray("points", this.points)
            }
            if (this.normals) {
                out.writePoint3fArray("normals", this.normals)
            }
        }
    }
    export class Mesh extends PointBased {
        faceVertexIndices?: ArrayLike<number>
        faceVertexCounts?: ArrayLike<number>

        override serialize(out: Writer): void {
            super.serialize(out)
            if (this.faceVertexIndices) {
                out.writeIntArray("faceVertexIndices", this.faceVertexIndices)
            }
            if (this.faceVertexCounts) {
                out.writeIntArray("faceVertexCounts", this.faceVertexCounts)
            }
        }
    }
}

class Prim {
    constructor(name: string) { }
    setToken(key: string, value: string) {
        CrateDataType.Token
    }
    setIntArray(key: string, value: ArrayLike<number>) {
        CrateDataType.Int
    }
    setVec3fArray(key: string, value: ArrayLike<number>) {
        CrateDataType.Vec3f
    }
}

class Attribute extends Prim { }

// [ ] try something easy in the beginning
//   [ ] just a Xform without fields
//   [ ] then a single field

export class Writer {
    offset = 0
    buffer = new DataView(new Uint8Array(0xffff).buffer)
    // tokens   string[]
    // strings  number[]
    // fields   Field[] {name, valuerep}
    // fieldset_indices number[]
    // nodes
    // specs    {path_index, 
    //           fieldset_index, 
    //           spec_type: PseudoRoot, Prim, Attribute}[]
    writeString(value: string, fixedSize?: number) {
        let end: number | undefined
        if (fixedSize !== undefined) {
            if (value.length >= fixedSize) {
                throw Error(`string ${value} exceeds required fixedSize of ${fixedSize} bytes`)
            }
            end = this.offset + fixedSize
        }
        for (let i = 0; i < value.length; ++i) {
            this.buffer.setUint8(this.offset++, value.charCodeAt(i))
        }
        if (end) {
            this.offset = end
        }
    }
    writeUint8(value: number) {
        this.buffer.setUint8(this.offset++, value)
    }
    writeUint16(value: number) {
        this.buffer.setUint16(this.offset, value, true)
        this.offset += 2
    }
    writeUint32(value: number) {
        this.buffer.setUint16(this.offset, value, true)
        this.offset += 4
    }
    writeUint64(value: number) {
        this.buffer.setBigUint64(this.offset, BigInt(value), true)
        this.offset += 8
    }

    writeIntArray(name: string, value: ArrayLike<number>) {
        const attr = new Attribute(name)
        attr.setToken("typeName", "int[]")
        attr.setIntArray("default", value)
    }
    writePoint3fArray(name: string, value: ArrayLike<number>) {
        const attr = new Attribute(name)
        attr.setToken("typeName", "point3f[]")
        attr.setVec3fArray("default", value)
    }
}
