// git clone https://github.com/PixarAnimationStudios/OpenUSD.git
// pxr/usd/sdf/crateFile.h
import { compressBound, decompressBlock } from "lz4js"
import { Reader } from "./crate/Reader.js"
import { CrateFile } from "./crate/CrateFile.ts"
import { UsdNode } from "./crate/UsdNode.ts"
import { vec3 } from "gl-matrix"

type Index = number
export type StringIndex = Index
export type TokenIndex = Index

// src/integerCoding.cpp: _DecompressIntegers(...)
export function readCompressedInts(reader: Reader, numInts: number) {
    const compressedSize = reader.getUint64()
    // console.log(`readCompressedInts(): n=${numInts}, compressedSize=${compressedSize}`)

    const uncompressed = Buffer.alloc(numInts * 4)
    const compressed = new Uint8Array(reader._dataview.buffer, reader.offset, compressedSize)
    reader.offset += compressedSize

    const decompSz = decompressFromBuffer(compressed, uncompressed)

    return decodeIntegers(new DataView(uncompressed.buffer), numInts)
}

interface ARG {
    src: DataView
    result: number[]
    output: number
    codesIn: number
    vintsIn: number
    commonValue: number
    prevVal: number
}

function decodeNHelper(N: number, arg: ARG) {
    enum Code { Common, Small, Medium, Large };
    const codeByte = arg.src.getUint8(arg.codesIn++)
    // console.log(`decodeNHelper(N=${N}): codeByte=${codeByte}`)
    for (let i = 0; i != N; ++i) {
        const x = (codeByte & (3 << (2 * i))) >> (2 * i)
        switch (x) {
            default:
            case Code.Common:
                arg.prevVal += arg.commonValue
                break
            case Code.Small:
                arg.prevVal += arg.src.getInt8(arg.vintsIn)
                arg.vintsIn += 1
                break
            case Code.Medium:
                arg.prevVal += arg.src.getInt16(arg.vintsIn)
                arg.vintsIn += 2
                break
            case Code.Large:
                arg.prevVal += arg.src.getInt32(arg.vintsIn)
                arg.vintsIn += 4
                break
        }
        arg.prevVal &= 0xffffffff
        // console.log(`  i=${i}, x=${x}, prevVal=${arg.prevVal} []`)
        arg.result[arg.output++] = arg.prevVal
    }
}

export function decodeIntegers(src: DataView, numInts: number) {
    // console.log("decodeIntegers() >>>>>>>>>>>>>>>>>>>>>>>>>>")

    // const src = new DataView(uncompressed)
    const commonValue = src.getUint32(0, true)
    // console.log(`commonValue = ${commonValue}`)

    const numCodesBytes = (numInts * 2 + 7) / 8
    let prevVal = 0
    let intsLeft = numInts

    const arg: ARG = {
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
    switch (intsLeft) {
        case 1:
        case 2:
        case 3:
            decodeNHelper(intsLeft, arg)
            break
        case 0:
        default:
            break
    };
    // hexdump(new Uint8Array(arg.result.buffer))
    // console.log("decodeIntegers() <<<<<<<<<<<<<<<<<<<<<<<<<<")
    // for (let i = 0; i < arg.result.length; ++i) {
    //     console.log(`[${i}] = ${arg.result[i]}`)
    // }
    return arg.result
}

// // readfields 
// export function readCompressedInts(reader: Reader) {
//     const compSize = reader.getUint64()
// }

// OpenUSD/pxr/base/tf/fastCompression.cpp: TfFastCompression::DecompressFromBuffer(...)
// tinyusdz/src/lz4-compression.cc: LZ4Compression::DecompressFromBuffer(...)
export function decompressFromBuffer(src: Uint8Array, dst: Uint8Array) {
    const nChunks = src.at(0)
    if (nChunks === 0) {
        const n = decompressBlock(src, dst, 1, src.byteLength - 1, 0)
        if (n < 0) {
            throw Error("Failed to decompress data, possibly corrupt?")
        }
        return n
    } else {
        throw Error("yikes")
    }
}

export class UsdStage {
    _crate: CrateFile
    constructor(buffer: Buffer) {
        const data = new DataView(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
        const reader = new Reader(data)
        this._crate = new CrateFile(reader)

    }
    getPrimAtPath(path: string) {
        if (path[0] !== '/') {
            throw Error('only absolute paths are implemented')
        }
        const pathSegments = path.split('/').splice(1)
        // console.log(`TRAVERSE %o (${path})`, s)
        let node: UsdNode | undefined = this._crate._nodes[0]
        for (const segment of pathSegments) {
            if (node === undefined) {
                throw Error(`path '${path}' not found`)
            }
            if (segment.length === 0) {
                break
            }
            // console.log(`FOUND ${i.name}, LOOKUP '${t}'`)
            node = node.getChildPrim(segment)
        }

        // if (i !== undefined) {
        //     console.log(`FOUND NOW %o`, i.name)
        // } else {
        //     console.log(`FOUND NOT`)
        // }
        return node
    }
}

// OpenUSD/pxr/usd/usd/schema.usda:class "Typed"
// OpenUSD/pxr/usd/usd/typed.h

/**
 * The base class for all _typed_ schemas (those that can impart a
 * typeName to a UsdPrim), and therefore the base class for all
 * concrete, instantiable "IsA" schemas.
 *      
 * UsdTyped implements a typeName-based query for its override of
 * UsdSchemaBase::_IsCompatible().  It provides no other behavior.
 */
class Typed {

}

// OpenUSD/pxr/usd/usdGeom/schema.usda

/**
 * Base class for all prims that may require rendering or 
 * visualization of some sort. The primary attributes of Imageable 
 * are _visibility_ and _purpose_, which each provide instructions for
 * what geometry should be included for processing by rendering and other
 * computations.
 */
class Imageable extends Typed {

}

/**
 * Base class for all transformable prims, which allows arbitrary
 * sequences of component affine transformations to be encoded.
 */
class Xformable extends Imageable {

}

/**
 * Concrete prim schema for a transform, which implements Xformable
 */
class XForm extends Xformable {
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
class Boundable extends Xformable {
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

class Mesh extends PointBased {
    faceVertexIndices!: ArrayLike<number>
    faceVertexCounts!: ArrayLike<number>
}