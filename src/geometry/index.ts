import { AssetPathAttr, FloatAttr, IntArrayAttr, Relationship, VariabilityAttr, Vec2fArrayAttr, Vec3fArrayAttr } from "../attributes/index.ts"
import type { Crate } from "../crate/Crate.ts"
import type { ListOp } from "../crate/Fields.ts"
import { Specifier } from "../crate/Specifier.ts"
import { isPrim, SpecType } from "../crate/SpecType.ts"
import { UsdNode } from "../crate/UsdNode.ts"
import { Variability } from "../crate/Variability.ts"

export class SchemaBase extends UsdNode { }

/**
 * The base class for all _typed_ schemas (those that can impart a
 * typeName to a UsdPrim), and therefore the base class for all
 * concrete, instantiable "IsA" schemas.
 *      
 * UsdTyped implements a typeName-based query for its override of
 * UsdSchemaBase::_IsCompatible().  It provides no other behavior.
 * 
 * defined in pxr/usd/usd/schema.usda
 */
export class Typed extends SchemaBase {
    protected specifier?: Specifier
    protected typeName?: string

    override encodeFields(): void {
        super.encodeFields()
        this.setSpecifier("specifier", this.specifier)
        this.setToken("typeName", this.typeName)
    }
}

/**
 * Base class for all prims that may require rendering or 
 * visualization of some sort. The primary attributes of Imageable 
 * are _visibility_ and _purpose_, which each provide instructions for
 * what geometry should be included for processing by rendering and other
 * computations.
 *
 * defined in pxr/usd/usdGeom/schema.usda
 */
export class Imageable extends Typed { }

/**
 * Base class for all transformable prims, which allows arbitrary
 * sequences of component affine transformations to be encoded.
 * 
 * defined in pxr/usd/usdGeom/schema.usda
 */
export class Xformable extends Imageable { }

/**
 * Concrete prim schema for a transform, which implements Xformable
 * 
 * defined in pxr/usd/usdGeom/schema.usda
 */
export class Xform extends Xformable {
    customData?: any

    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "Xform"
    }

    override encodeFields(): void {
        super.encodeFields()
        this.setCustomData("customData", this.customData)
    }
}

/**
 * Boundable introduces the ability for a prim to persistently
 * cache a rectilinear, local-space, extent.
 */
export class Boundable extends Xformable {
    set extent(value: ArrayLike<number> | undefined) {
        this.deleteChild("extent")
        if (value !== undefined) {
            new Vec3fArrayAttr(this, "extent", value, "float3[]")
        }
    }
}

/**
 * Base class for all geometric primitives.  
 *   
 *   Gprim encodes basic graphical properties such as _doubleSided_ and
 *   _orientation_, and provides primvars for "display color" and "display
 *   opacity" that travel with geometry to be used as shader overrides.
 */
export class Gprim extends Boundable {
    // color3f[] primvars:displayColor
    // float[] primvars:displayOpacity
    // uniform bool doubleSided = false
    set doubleSided(value: boolean | undefined) {
        this.deleteChild("doubleSided")
        if (value !== undefined) {
            const attr = new Attribute(this, "doubleSided", value)
            attr.custom = undefined
            attr.variability = Variability.Uniform
        }
    }
    // uniform token orientation = "rightHanded" "leftHanded"
}

/**
 * Concrete prim schema for a transform, which implements Xformable
 * 
 * defined in pxr/usd/usdSkel/schema.usda
 */
export class SkelRoot extends Boundable {
    customData?: any

    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "SkelRoot"
    }

    override encodeFields(): void {
        super.encodeFields()
        this.setCustomData("customData", this.customData)
    }
}

// Cube size
// Sphere radius
// Cylinder
// Capsule
// Cone
// Cylinder_1
// Capsule_1
// Plane

export type SubdivisionScheme = "catmullClark" | "loop" | "bilinear" | "none"
export type InterpolateBoundary = "none" | "edgeOnly" | "edgeAndCorner"
export type FaceVaryingLinearInterpolation = "none" | "cornersOnly" | "cornersPlus1" | "cornersPlus2" | "boundaries" | "all"

export class PointBased extends Gprim {
    set points(value: ArrayLike<number> | undefined) {
        this.deleteChild("points")
        if (value !== undefined) {
            new Vec3fArrayAttr(this, "points", value, "point3f[]")
        }
    }
    set texCoords(value: ArrayLike<number> | undefined) {
        this.deleteChild("primvars:st")
        if (value !== undefined) {
            const attr = new Vec2fArrayAttr(this.crate, this, "primvars:st", value, "texCoord2f[]")
            attr.interpolation = "faceVarying"
        }
    }
    // vector3f[] velocities
    // vector3f[] accelerations
    set normals(value: ArrayLike<number> | undefined) {
        this.deleteChild("normals")
        if (value !== undefined) {
            const attr = new Vec3fArrayAttr(this, "normals", value, "normal3f[]")
            attr.interpolation = "faceVarying"
        }
    }

    // uniform token subdivisionScheme = "catmullClark" 
    set subdivisionScheme(value: SubdivisionScheme | undefined) {
        this.deleteChild("subdivisionScheme")
        if (value !== undefined) {
            new VariabilityAttr(this, "subdivisionScheme", Variability.Uniform, value)
        }
    }
    interpolateBoundary: InterpolateBoundary = "edgeAndCorner"
    faceVaryingLinearInterpolation: FaceVaryingLinearInterpolation = "cornersPlus1"
}

export class Mesh extends PointBased {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "Mesh"
    }

    override encodeFields(): void {
        super.encodeFields()
        this.setTokenListOp("apiSchemas", this.apiSchemas)
        this.setBoolean("active", true)
    }

    private apiSchemas?: ListOp<string>

    protected prependApiSchema(name: string) {
        if (this.apiSchemas === undefined) {
            this.apiSchemas = {}
        }
        if (this.apiSchemas.prepend === undefined) {
            this.apiSchemas.prepend = []
        }
        if (this.apiSchemas.prepend.find(it => it === name) === undefined) {
            this.apiSchemas.prepend.push(name)
        }
    }

    // also in Material
    set blenderDataName(value: string | undefined) {
        this.deleteChild("userProperties:blender:data_name")
        if (value !== undefined) {
            const attr = new Attribute(this, "userProperties:blender:data_name", value)
            attr.custom = true
        }
    }

    set faceVertexIndices(value: ArrayLike<number> | undefined) {
        this.deleteChild("faceVertexIndices")
        if (value !== undefined) {
            new IntArrayAttr(this, "faceVertexIndices", value)
        }
    }
    set faceVertexCounts(value: ArrayLike<number> | undefined) {
        this.deleteChild("faceVertexCounts")
        if (value !== undefined) {
            new IntArrayAttr(this, "faceVertexCounts", value)
        }
    }

    // MaterialBindingAPI: material:binding
    // pxr/usd/usdShade/schema.usda
    set materialBinding(value: ListOp<UsdNode> | undefined) {
        this.deleteChild("material:binding")
        if (value !== undefined) {
            this.prependApiSchema("MaterialBindingAPI")
            new Relationship(this, "material:binding", value)
        }
    }
    /**
     * GeomSubset
     */
    set familyType(value: "partition" | "nonOverlapping" | "unrestricted" | undefined) {
        this.deleteChild("subsetFamily:materialBind:familyType")
        if (value !== undefined) {
            new VariabilityAttr(this, "subsetFamily:materialBind:familyType", Variability.Uniform, value)
        }
    }
}

export class DomeLight extends UsdNode {
    constructor(crate: Crate, parent: UsdNode, name: string) {
        super(crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        new FloatAttr(this, "inputs:intensity", 1)
        new AssetPathAttr(this, "inputs:texture:file", "./textures/color_0C0C0C.exr")
    }
    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setSpecifier("specifier", Specifier.Def)
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "DomeLight")
        )
    }
}

/**
 * Scope is the simplest grouping primitive, and does not carry the
 * baggage of transformability.  Note that transforms should inherit down
 * through a Scope successfully - it is just a guaranteed no-op from a
 * transformability perspective.
 * 
 * defined in pxr/usd/usdGeom/schema.usda
 */
export class Scope extends Imageable {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "Scope"
    }
}

export class Material extends UsdNode {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
    }
    set blenderDataName(value: string | undefined) {
        this.deleteChild("userProperties:blender:data_name")
        if (value !== undefined) {
            const attr = new Attribute(this, "userProperties:blender:data_name", value)
            attr.custom = true
        }
    }
    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setSpecifier("specifier", Specifier.Def)
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "Material")
        )
    }
}

export class Shader extends UsdNode {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Prim
    }
    set blenderDataName(value: string | undefined) {
        this.deleteChild("userProperties:blender:data_name")
        if (value !== undefined) {
            const attr = new Attribute(this, "userProperties:blender:data_name", value)
            attr.custom = true
        }
    }
    override encodeFields(): void {
        super.encodeFields()
        const crate = this.crate
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setSpecifier("specifier", Specifier.Def)
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "Shader")
        )
    }
}

export class AttributeX extends UsdNode {
    private _fields: (node: UsdNode) => void
    constructor(parent: UsdNode, name: string, fields: (node: UsdNode) => void) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this._fields = fields
    }

    override encodeFields(): void {
        super.encodeFields()
        this._fields(this)
    }
}

export class Attribute extends UsdNode {
    value: any
    variability?: Variability
    custom?: boolean

    constructor(parent: UsdNode, name: string, value: any) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.value = value
        this.custom = false
    }

    override encodeFields(): void {
        super.encodeFields()
        this.setBoolean("custom", this.custom)
        switch (typeof this.value) {
            case "string":
                this.crate.fieldsets.fieldset_indices.push(
                    this.crate.fields.setToken("typeName", "string")
                )
                this.crate.fieldsets.fieldset_indices.push(
                    this.crate.fields.setString("default", this.value)
                )
                break
            case "boolean":
                this.crate.fieldsets.fieldset_indices.push(
                    this.crate.fields.setToken("typeName", "bool")
                )
                if (this.variability) {
                    this.crate.fieldsets.fieldset_indices.push(
                        this.crate.fields.setVariability("variability", this.variability)
                    )
                }
                this.crate.fieldsets.fieldset_indices.push(
                    this.crate.fields.setBoolean("default", this.value)
                )
                break
            default:
                throw Error("TBD")
        }

    }
}

export class GeomSubset extends UsdNode {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Prim
    }
    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setSpecifier("specifier", Specifier.Def)
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "GeomSubset")
        )

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setTokenListOp("apiSchemas", {
                prepend: ["MaterialBindingAPI"]
            })
        )
    }
}
