// git clone https://github.com/PixarAnimationStudios/OpenUSD.git
// pxr/usd/sdf/crateFile.h
import { Reader } from "./crate/Reader.js"
import { CrateFile } from "./crate/CrateFile.ts"
import { UsdNode } from "./crate/UsdNode.ts"
import { vec3 } from "gl-matrix"
import { hexdump } from "./detail/hexdump.ts"
import { compressBlock, compressBound, decompressBlock } from "./crate/lz4.ts"

type Index = number
export type StringIndex = Index
export type TokenIndex = Index

// encode / decode int32
// int32: common value
// sequence of uint8 containing 4 Codes
// sequence of int8|int16|int32 as defined by the codes
// encoded values are the difference to the previous value
enum Code { Common, Int8, Int16, Int32 };

interface ARGE {
    input: number[],
    output: DataView,
    cur: number,
    commonValue: number,
    prevVal: number,
    codesOut: number,
    vintsOut: number
}

function encodeNHelper(N: number, arg: ARGE) {
    const getCode = (x: number) => {
        if (x === arg.commonValue) { return Code.Common }
        if (x >= -128 && x <= 127) { return Code.Int8 }
        if (x >= -32768 && x <= 32767) { return Code.Int16 }
        return Code.Int32
    }

    let codeByte = 0
    for (let i = 0; i != N; ++i) {
        let val = arg.input[arg.cur] - arg.prevVal
        arg.prevVal = arg.input[arg.cur++]
        const code = getCode(val)
        codeByte |= (code << (2 * i))
        switch (code) {
            default:
            case Code.Common:
                break
            case Code.Int8:
                arg.output.setInt8(arg.vintsOut, val)
                arg.vintsOut += 1
                break
            case Code.Int16:
                arg.output.setInt16(arg.vintsOut, val, true)
                arg.vintsOut += 2
                break
            case Code.Int32:
                arg.output.setInt32(arg.vintsOut, val, true)
                arg.vintsOut += 4
                break
        };
    }
    arg.output.setUint8(arg.codesOut, codeByte)
    ++arg.codesOut
}

export function encodeIntegers(input: number[], output: DataView) {
    if (input.length === 0) {
        return 0
    }

    // First find the most common element value.
    let commonValue = 0
    {
        let commonCount = 0
        const counts = new Map<number, number>()
        let prevVal = 0
        for (let cur = 0; cur < input.length; ++cur) {
            let val = input[cur] - prevVal
            let count = counts.get(val)
            if (count === undefined) {
                count = 1
            } else {
                ++count
            }
            counts.set(val, count)

            if (count > commonCount) {
                commonValue = val
                commonCount = count
            } else if (count == commonCount && val > commonValue) {
                // Take the largest common value in case of a tie -- this gives
                // the biggest potential savings in the encoded stream.
                commonValue = val
            }
            prevVal = input[cur]
        }
    }

    // Now code the values.

    // Write most common value.
    output.setInt32(0, commonValue, true)
    let numInts = input.length

    const arg: ARGE = {
        input,
        output,
        cur: 0,
        commonValue,
        prevVal: 0,
        codesOut: 4,
        vintsOut: Math.floor(4 + (input.length * 2 + 7) / 8)
    }

    while (numInts >= 4) {
        encodeNHelper(4, arg)
        numInts -= 4
    }
    switch (numInts) {
        case 0: default: break
        case 1: encodeNHelper(1, arg)
            break
        case 2: encodeNHelper(2, arg)
            break
        case 3: encodeNHelper(3, arg)
            break
    };
    return arg.vintsOut
}

interface ARGD {
    src: DataView
    result: number[]
    output: number
    codesIn: number
    vintsIn: number
    commonValue: number
    prevVal: number
}

function decodeNHelper(N: number, arg: ARGD) {
    const codeByte = arg.src.getUint8(arg.codesIn++)
    // console.log(`decodeNHelper(N=${N}): codeByte=${codeByte}`)
    for (let i = 0; i != N; ++i) {
        const x = (codeByte & (3 << (2 * i))) >> (2 * i)
        switch (x) {
            default:
            case Code.Common:
                arg.prevVal += arg.commonValue
                break
            case Code.Int8:
                arg.prevVal += arg.src.getInt8(arg.vintsIn)
                arg.vintsIn += 1
                break
            case Code.Int16:
                arg.prevVal += arg.src.getInt16(arg.vintsIn)
                arg.vintsIn += 2
                break
            case Code.Int32:
                arg.prevVal += arg.src.getInt32(arg.vintsIn)
                arg.vintsIn += 4
                break
        }
        arg.prevVal &= 0xffffffff
        arg.result[arg.output++] = arg.prevVal
    }
}

export function decodeIntegers(src: DataView, numInts: number): number[] {

    const commonValue = src.getInt32(0, true)

    const numCodesBytes = Math.floor((numInts * 2 + 7) / 8)
    let prevVal = 0
    let intsLeft = numInts

    const arg: ARGD = {
        src,
        result: new Array(numInts),
        output: 0,
        codesIn: 4,
        vintsIn: 4 + numCodesBytes,
        commonValue,
        prevVal
    }
    while (intsLeft >= 4) {
        decodeNHelper(4, arg)
        intsLeft -= 4
    }
    if (intsLeft > 0) {
        decodeNHelper(intsLeft, arg)
    }
    return arg.result
}

// OpenUSD/pxr/base/tf/fastCompression.cpp: TfFastCompression::DecompressFromBuffer(...)
// tinyusdz/src/lz4-compression.cc: LZ4Compression::DecompressFromBuffer(...)
export function decompressFromBuffer(src: Uint8Array, dst: Uint8Array) {
    const nChunks = src.at(0)!
    if (nChunks > 127) {
        throw Error(`too many chunks`)
    }
    if (nChunks === 0) {
        const n = decompressBlock(src, dst, 1, src.byteLength - 1, 0)
        if (n < 0) {
            throw Error("Failed to decompress data, possibly corrupt?")
        }
        return n
    }
    throw Error("decompressFromBuffer(): chunks are not implemented yet")
}

export function compressToBuffer(src: Uint8Array, dst: Uint8Array) {
    const LZ4_MAX_INPUT_SIZE = 0x7E000000
    if (src.length < LZ4_MAX_INPUT_SIZE) {
        if (dst.length < compressBound(src.length) + 1) {
            throw Error(`compressToBuffer(): dst has ${dst.length} octets but at least ${compressBound(src.length) + 1} are needed`)
        }
        const skipFirstByte = new Uint8Array(dst.buffer, 1, dst.buffer.maxByteLength-1)
        const n = compressBlock(src, skipFirstByte, 0, src.byteLength)
        return n + 1
    }
    throw Error("compressToBuffer(): chunks are not implemented yet")
}

export class UsdStage {
    _crate!: CrateFile
    constructor(buffer?: Buffer) {
        if (buffer) {
            const data = new DataView(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
            const reader = new Reader(data)
            this._crate = new CrateFile(reader)
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

// OpenUSD/pxr/usd/usd/schema.usda:class "Typed"
// OpenUSD/pxr/usd/usd/typed.h

class UsdSchemaBase { }

/**
 * The base class for all _typed_ schemas (those that can impart a
 * typeName to a UsdPrim), and therefore the base class for all
 * concrete, instantiable "IsA" schemas.
 *      
 * UsdTyped implements a typeName-based query for its override of
 * UsdSchemaBase::_IsCompatible().  It provides no other behavior.
 */
class UsdTyped extends UsdSchemaBase {

}

// OpenUSD/pxr/usd/usdGeom/schema.usda

/**
 * Base class for all prims that may require rendering or 
 * visualization of some sort. The primary attributes of Imageable 
 * are _visibility_ and _purpose_, which each provide instructions for
 * what geometry should be included for processing by rendering and other
 * computations.
 */
class UsdImageable extends UsdTyped {

}

/**
 * Base class for all transformable prims, which allows arbitrary
 * sequences of component affine transformations to be encoded.
 */
class UsdGeomXformable extends UsdImageable {

}

/**
 * Concrete prim schema for a transform, which implements Xformable
 */
class UsdGeomXform extends UsdGeomXformable {
}

/**
 * Boundable introduces the ability for a prim to persistently
 * cache a rectilinear, local-space, extent.
 * 
 * ### Why Extent and not Bounds ?
 * Boundable introduces the notion of "extent", which is a cached computation
 * of a prim's local-space 3D range for its resolved attributes <b>at the
 * layer and time in which extent is authored</b>.  We have found that with
 * composed scene description, attempting to cache pre-computed bounds at
 * interior prims in a scene graph is very fragile, given the ease with which
 * one can author a single attribute in a stronger layer that can invalidate
 * many authored caches - or with which a re-published, referenced asset can
 * do the same.
 *   
 * Therefore, we limit to precomputing (generally) leaf-prim extent, which
 * avoids the need to read in large point arrays to compute bounds, and
 * provides UsdGeomBBoxCache the means to efficiently compute and
 * (session-only) cache intermediate bounds.  You are free to compute and
 * author intermediate bounds into your scenes, of course, which may work
 * well if you have sufficient locks on your pipeline to guarantee that once
 * authored, the geometry and transforms upon which they are based will
 * remain unchanged, or if accuracy of the bounds is not an ironclad
 * requisite. 
 *   
 * When intermediate bounds are authored on Boundable parents, the child prims
 * will be pruned from BBox computation; the authored extent is expected to
 * incorporate all child bounds.
 */
class Boundable extends UsdGeomXformable {
    extent!: vec3[]
}

/**
 * Base class for all geometric primitives.  
 *   
 * Gprim encodes basic graphical properties such as \\em doubleSided and
 * \\em orientation, and provides primvars for "display color" and "display
 * opacity" that travel with geometry to be used as shader overrides.
 */
class Gprim extends Boundable {

}

/**
 * Base class for all UsdGeomGprims that possess points,
 * providing common attributes such as normals and velocities.
 */
class PointBased extends Gprim {
    points?: ArrayLike<number>
    normals?: ArrayLike<number>
}

class UsdGeomMesh extends PointBased {
    faceVertexIndices?: ArrayLike<number>
    faceVertexCounts?: ArrayLike<number>
}