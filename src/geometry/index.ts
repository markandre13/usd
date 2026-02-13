import { IntArrayAttr, VariabilityAttr, Vec3fArrayAttr } from "../attributes/index.ts"
import type { Crate } from "../crate/Crate.ts"
import { Specifier } from "../crate/Specifier.ts"
import { isPrim, SpecType } from "../crate/SpecType.ts"
import { UsdNode } from "../crate/UsdNode.ts"
import { Variability } from "../crate/Variability.ts"

export class SchemaBase extends UsdNode { }
export class Typed extends SchemaBase { }
export class Imageable extends Typed { }
export class Xformable extends Imageable { }

// blender mesh options and how they map to usd
//   shade: flat | smooth
//     'normals' are not per 'points' but 'faceVertexIndices'
//     and the flat/smooth is encoded via those
//   edge > mark sharp
//   edge > mark seam (i guess this is for uv?)
//   edge > bevel weight
//   edge > edge crease
//
//   materials
//     multiple materials for one mesh
//       via GeomSubset which lists the faces
//       viewport display is not stored but taken from color itself during import
//   armature, weights
//   blendshape

//   subdivision modifier becomes part of the Mesh... but might loose sharp edges (?)

export class PseudoRoot extends UsdNode {
    metersPerUnit: number = 1.0
    documentation = "makehuman.js"
    upAxis = "Z"

    constructor(crate: Crate) {
        super(crate, undefined, -1, "/", true)
        this.spec_type = SpecType.PseudoRoot
    }

    // defaultPrim = "root"

    override encode() {
        const crate = this.crate
        this.index = crate.paths._nodes.length
        crate.paths._nodes.push(this)

        crate.specs.fieldsetIndexes.push(crate.fieldsets.fieldset_indices.length)
        crate.specs.pathIndexes.push(this.index)
        crate.specs.specTypeIndexes.push(this.spec_type!)

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setDouble("metersPerUnit", this.metersPerUnit)
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setString("documentation", this.documentation)
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("upAxis", this.upAxis)
        )
        if (this.children.length > 0) {
            crate.fieldsets.fieldset_indices.push(
                crate.fields.setTokenVector("primChildren", [this.children[0].name])
            )
            crate.fieldsets.fieldset_indices.push(
                crate.fields.setToken("defaultPrim", this.children[0].name)
            )
        }
        crate.fieldsets.fieldset_indices.push(-1)

        for (const child of this.children) {
            child.encode()
        }
    }
}

export class Xform extends Xformable {
    customData?: any

    constructor(crate: Crate, parent: UsdNode, name: string) {
        super(crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
    }

    override encode() {
        const crate = this.crate
        this.index = crate.paths._nodes.length
        crate.paths._nodes.push(this)
        crate.specs.fieldsetIndexes.push(crate.fieldsets.fieldset_indices.length)
        crate.specs.pathIndexes.push(this.index)
        crate.specs.specTypeIndexes.push(this.spec_type!)

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setSpecifier("specifier", Specifier.Def)
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "Xform")
        )
        if (this.customData !== undefined) {
            crate.fieldsets.fieldset_indices.push(
                crate.fields.setDictionary("customData", this.customData)
            )
        }
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setTokenVector("primChildren", this.children
                .filter(it => isPrim(it.getType()))
                .map(it => it.name))
        )

        crate.fieldsets.fieldset_indices.push(-1)

        for (const child of this.children) {
            child.encode()
        }
    }
}

export class Boundable extends Xformable {
    extent?: ArrayLike<number>
}
export class Gprim extends Boundable {
    // color3f[] primvars:displayColor
    // float[] primvars:displayOpacity
    // uniform bool doubleSided = false
    // uniform token orientation = "rightHanded" "leftHanded"
}

// Cube size
// Sphere radius
// Cylinder
// Capsule
// Cone
// Cylinder_1
// Capsule_1
// Plane

export class PointBased extends Gprim {
    points?: ArrayLike<number>
    // vector3f[] velocities
    // vector3f[] accelerations
    normals?: ArrayLike<number>

    // uniform token subdivisionScheme = "catmullClark" 
    subdivisionScheme: "catmullClark" | "loop" | "bilinear" | "none" = "catmullClark"
    interpolateBoundary: "none" | "edgeOnly" | "edgeAndCorner" = "edgeAndCorner"
    faceVaryingLinearInterpolation: "none" | "cornersOnly" | "cornersPlus1" | "cornersPlus2" | "boundaries" | "all" = "cornersPlus1"
}

export class Mesh extends PointBased {
    faceVertexIndices?: ArrayLike<number>
    faceVertexCounts?: ArrayLike<number>

    constructor(crate: Crate, parent: UsdNode, name: string) {
        super(crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
    }

    override encode() {
        const crate = this.crate
        this.index = crate.paths._nodes.length
        crate.paths._nodes.push(this)
        crate.specs.fieldsetIndexes.push(crate.fieldsets.fieldset_indices.length)
        crate.specs.pathIndexes.push(this.index)
        crate.specs.specTypeIndexes.push(this.spec_type!)

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setSpecifier("specifier", Specifier.Def)
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "Mesh")
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setBoolean("active", true)
        )

        const properties: string[] = []

        properties.push("subdivisionScheme")
        new VariabilityAttr(crate, this, "subdivisionScheme", Variability.Uniform, this.subdivisionScheme)

        if (this.extent !== undefined) {
            properties.push("extent")
            new Vec3fArrayAttr(crate, this, "extent", this.extent, "float3[]")
        }

        if (this.points !== undefined) {
            properties.push("points")
            new Vec3fArrayAttr(crate, this, "points", this.points, "point3f[]")
        }
        if (this.normals !== undefined) {
            properties.push("normals")
            new Vec3fArrayAttr(crate, this, "normals", this.normals, "normal3f[]")
        }

        if (this.faceVertexIndices !== undefined) {
            properties.push("faceVertexIndices")
            new IntArrayAttr(crate, this, "faceVertexIndices", this.faceVertexIndices)
        }
        if (this.faceVertexCounts !== undefined) {
            properties.push("faceVertexCounts")
            new IntArrayAttr(crate, this, "faceVertexCounts", this.faceVertexCounts)
        }

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setTokenVector("properties", properties)
        )

        crate.fieldsets.fieldset_indices.push(-1)

        for (const child of this.children) {
            child.encode()
        }
    }
}
