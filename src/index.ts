// git clone https://github.com/PixarAnimationStudios/OpenUSD.git
// pxr/usd/sdf/crateFile.h
import { Reader } from "./crate/Reader.js"
import { CrateFile } from "./crate/CrateFile.ts"
import { UsdNode } from "./crate/UsdNode.ts"
import { vec3 } from "gl-matrix"
import { compressBlock, compressBound, decompressBlock } from "./compression/lz4.ts"

type Index = number
export type StringIndex = Index
export type TokenIndex = Index

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