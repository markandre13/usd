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
export abstract class Xformable extends Imageable {
    customData?: any

    override encodeFields(): void {
        super.encodeFields()
        this.setCustomData("customData", this.customData)
    }

    set blenderObjectName(value: string | undefined) {
        this.deleteChild("userProperties:blender:object_name")
        if (value !== undefined) {
            const attr2 = new Attribute(this, "userProperties:blender:object_name", value)
            attr2.custom = true
        }
    }
    set rotateXYZ(value: number[] | undefined) {
        this.deleteChild("xformOp:rotateXYZ")
        new AttributeX(this, "xformOp:rotateXYZ", (node) => {
            node.setToken("typeName", "float3")
            node.setVec3f("default", value)
        })
    }
    set scale(value: number[] | undefined) {
        this.deleteChild("xformOp:scale")
        new AttributeX(this, "xformOp:scale", (node) => {
            node.setToken("typeName", "float3")
            node.setVec3f("default", value)
        })
    }
    set translate(value: number[] | undefined) {
        this.deleteChild("xformOp:translate")
        new AttributeX(this, "xformOp:translate", (node) => {
            node.setToken("typeName", "double3")
            node.setVec3d("default", value)
        })
    }
    set xformOrder(value: ("xformOp:translate" | "xformOp:rotateXYZ" | "xformOp:scale")[] | undefined) {
        new AttributeX(this, "xformOpOrder", (node) => {
            node.setToken("typeName", "token[]")
            node.setVariability("variability", Variability.Uniform)
            node.setTokenArray("default", value)
        })
    }
}

/**
 * Concrete prim schema for a transform, which implements Xformable
 * 
 * defined in pxr/usd/usdGeom/schema.usda
 */
export class Xform extends Xformable {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "Xform"
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
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "SkelRoot"
    }
}

/**
 * Describes a skeleton.
 * 
 * defined in pxr/usd/usdSkel/schema.usda
 */
export class Skeleton extends Boundable {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "Skeleton"
    }

    override encodeFields(): void {
        super.encodeFields()
        this.setTokenListOp("apiSchemas", {
            prepend: ["SkelBindingAPI"]
        })
    }

    /**
     * An array of path tokens identifying the set of joints that make
     * up the skeleton, and their order. Each token in the array must be valid
     * when parsed as an SdfPath. The parent-child relationships of the
     * corresponding paths determine the parent-child relationships of each
     * joint. It is not required that the name at the end of each path be
     * unique, but rather only that the paths themselves be unique.
     */
    set joints(value: string[] | undefined) {
        this.deleteChild("joints")
        if (value !== undefined) {
            new AttributeX(this, "joints", (node) => {
                node.setToken("typeName", "token[]")
                node.setVariability("variability", Variability.Uniform)
                node.setTokenArray("default", value)
            })
        }
    }
    /**
     * If authored, provides a unique name per joint. This may be
     * optionally set to provide better names when translating to DCC apps 
     * that require unique joint names.
     */
    set jointNames(value: string[] | undefined) {
        this.deleteChild("jointNames")
        if (value !== undefined) {
            new AttributeX(this, "jointNames", (node) => {
                node.setToken("typeName", "token[]")
                node.setVariability("variability", Variability.Uniform)
                node.setTokenArray("default", value)
            })
        }
    }

    /**
     * Specifies the bind-pose transforms of each joint in
     * **world space**, in the ordering imposed by _joints_.
     */
    set bindTransforms(value: number[] | undefined) {
        this.deleteChild("bindTransforms")
        if (value !== undefined) {
            new AttributeX(this, "bindTransforms", (node) => {
                node.setToken("typeName", "matrix4d[]")
                node.setVariability("variability", Variability.Uniform)
                node.setMatrix4dArray("default", value)
            })
        }
    }

    /**
     * Specifies the rest-pose transforms of each joint in
     * **local space**, in the ordering imposed by *joints*. This provides
     * fallback values for joint transforms when a Skeleton either has no
     * bound animation source, or when that animation source only contains
     * animation for a subset of a Skeleton's joints.
     */
    set restTransforms(value: number[] | undefined) {
        this.deleteChild("restTransforms")
        if (value !== undefined) {
            new AttributeX(this, "restTransforms", (node) => {
                node.setToken("typeName", "matrix4d[]")
                node.setVariability("variability", Variability.Uniform)
                node.setMatrix4dArray("default", value)
            })
        }
    }

    set blenderBoneLength(value: number[] | undefined) {
        this.deleteChild("primvars:blender:bone_lengths")
        new AttributeX(this, "primvars:blender:bone_lengths", (node) => {
            node.setToken("typeName", "float[]")
            node.setToken("interpolation", "uniform")
            node.setFloatArray("default", value)
        })
    }
}

/**
 * Transformable camera.
 * 
 * defined in pxr/usd/usdGeom/schema.usda
 */
export class Camera extends Boundable {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "Camera"
    }

    //
    // Viewing Frustum
    //
    set projection(value: "perspective" | "orthographic" | undefined) {
        this.deleteChild("projection")
        new AttributeX(this, "projection", (node) => {
            node.setToken("typeName", "token")
            node.setToken("default", value)
        })
    }
    set horizontalAperture(value: number | undefined) {
        this.deleteChild("horizontalAperture")
        new AttributeX(this, "horizontalAperture", (node) => {
            node.setToken("typeName", "float")
            node.setFloat("default", value)
        })
    }
    set verticalAperture(value: number | undefined) {
        this.deleteChild("verticalAperture")
        new AttributeX(this, "verticalAperture", (node) => {
            node.setToken("typeName", "float")
            node.setFloat("default", value)
        })
    }
    // horizontalApertureOffset
    // verticalApertureOffset
    set focalLength(value: number | undefined) {
        this.deleteChild("focalLength")
        new AttributeX(this, "focalLength", (node) => {
            node.setToken("typeName", "float")
            node.setFloat("default", value)
        })
    }
    set clippingRange(value: number[] | undefined) {
        this.deleteChild("clippingRange")
        new AttributeX(this, "clippingRange", (node) => {
            node.setToken("typeName", "float2")
            node.setVec2f("default", value)
        })
    }
    // clippingPlanes

    //
    // Depth of Field
    //
    // fStop
    // focusDistance

    //
    // Stereoscopic 3D
    //
    // stereoRole

    // 
    // Parameters for Motion Blur
    //

    // shutter:open
    // shutter:close 

    //
    // Exposure Adjustment
    //
    // exposure

    //
    // Exposure Controls
    //
    // exposure:iso
    // exposure:time
    // exposure:fStop
    // exposure:responsivity

    set blenderDataName(value: string | undefined) {
        this.deleteChild("userProperties:blender:data_name")
        if (value !== undefined) {
            const attr = new Attribute(this, "userProperties:blender:data_name", value)
            attr.custom = true
        }
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

    /**
     * Skeleton
     */
    set geomBindTransform(value: number[] | undefined) {
        this.deleteChild("primvars:skel:geomBindTransform")
        if (value !== undefined) {
            this.prependApiSchema("SkelBindingAPI")
            new AttributeX(this, "primvars:skel:geomBindTransform", node => {
                node.setToken("typeName", "matrix4d")
                node.setMatrix4d("default", value)
            })
        }
    }
    set jointIndices(value: {
        elementSize: number
        indices: number[]
    } | undefined) {
        this.deleteChild("primvars:skel:jointIndices")
        if (value !== undefined) {
            this.prependApiSchema("SkelBindingAPI")
            new AttributeX(this, "primvars:skel:jointIndices", node => {
                node.setToken("typeName", "int[]")
                node.setToken("interpolation", "vertex")
                node.setInt("elementSize", value.elementSize)
                node.setIntArray("default", value.indices)
            })
        }
    }
    set jointWeights(value: {
        elementSize: number
        indices: number[]
    } | undefined) {
        this.deleteChild("primvars:skel:jointWeights")
        if (value !== undefined) {
            this.prependApiSchema("SkelBindingAPI")
            new AttributeX(this, "primvars:skel:jointWeights", node => {
                node.setToken("typeName", "float[]")
                node.setToken("interpolation", "vertex")
                node.setInt("elementSize", value.elementSize)
                node.setFloatArray("default", value.indices)
            })
        }
    }

    set skeleton(value: Skeleton | undefined) {
        this.deleteChild("skel:skeleton")
        if (value !== undefined) {
            this.prependApiSchema("SkelBindingAPI")
            new Relationship(this, "skel:skeleton", {
                isExplicit: true,
                explicit: [value]
            })
        }
    }
}

class NonboundableLightBase extends UsdNode {
    // set enableColorTemperature(value: boolean | undefined) {
    //     this.deleteChild("inputs:enableColorTemperature")
    //     if (value !== undefined) {
    //         new AttributeX(this, "inputs:radius", (node) => {
    //             node.setToken("typeName", "bool")
    //             node.setBoolean("default", value)
    //         })
    //     }
    // }
    set normalize(value: boolean | undefined) {
        this.deleteChild("inputs:normalize")
        if (value !== undefined) {
            new AttributeX(this, "inputs:normalize", (node) => {
                node.setToken("typeName", "bool")
                node.setBoolean("default", value)
            })
        }
    }
    set intensity(value: number | undefined) {
        this.deleteChild("inputs:intensity")
        if (value !== undefined) {
            new AttributeX(this, "inputs:intensity", (node) => {
                node.setToken("typeName", "float")
                node.setFloat("default", value)
            })
        }
    }
    // set blenderDataName(value: string | undefined) {
    //     this.deleteChild("userProperties:blender:data_name")
    //     if (value !== undefined) {
    //         const attr = new Attribute(this, "userProperties:blender:data_name", value)
    //         attr.custom = true
    //     }
    // }
}

/**
 * Light emitted inward from a distant external environment,
 * such as a sky or IBL light probe.
 *   
 * In this version of the dome light, the dome's default orientation is such
 * that its top pole is aligned with the world's +Y axis. This adheres to the
 * OpenEXR specification for latlong environment maps.
 * 
 * defined in pxr/usd/usdLux/schema.usda
 */
export class DomeLight extends NonboundableLightBase {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
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

    set textureFile(value: string | undefined) {
        this.deleteChild("nputs:texture:file")
        if (value !== undefined) {
            new AssetPathAttr(this, "inputs:texture:file", value)
        }
    }

    // inputs:texture:file
    // inputs:texture:format
    // guideRadius
}

/**
 * Base class for intrinsic lights that are boundable.
 *
 * The primary purpose of this class is to provide a direct API to the 
 * functions provided by LightAPI for concrete derived light types.
 * 
 * defined in pxr/usd/usdLux/schema.usda
 */
class BoundableLightBase extends Boundable {
    set enableColorTemperature(value: boolean | undefined) {
        this.deleteChild("inputs:enableColorTemperature")
        if (value !== undefined) {
            new AttributeX(this, "inputs:enableColorTemperature", (node) => {
                node.setToken("typeName", "bool")
                node.setBoolean("default", value)
            })
        }
    }
    set normalize(value: boolean | undefined) {
        this.deleteChild("inputs:normalize")
        if (value !== undefined) {
            new AttributeX(this, "inputs:normalize", (node) => {
                node.setToken("typeName", "bool")
                node.setBoolean("default", value)
            })
        }
    }
    set intensity(value: number | undefined) {
        this.deleteChild("inputs:intensity")
        if (value !== undefined) {
            new AttributeX(this, "inputs:intensity", (node) => {
                node.setToken("typeName", "float")
                node.setFloat("default", value)
            })
        }
    }
    set blenderDataName(value: string | undefined) {
        this.deleteChild("userProperties:blender:data_name")
        if (value !== undefined) {
            const attr = new Attribute(this, "userProperties:blender:data_name", value)
            attr.custom = true
        }
    }
}

/**
 * Light emitted outward from a sphere.
 * 
 * defined in pxr/usd/usdLux/schema.usda
 */
export class SphereLight extends BoundableLightBase {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, true)
        this.spec_type = SpecType.Prim
        this.specifier = Specifier.Def
        this.typeName = "SphereLight"

    }

    /**
     * Radius of the sphere.
     */
    set radius(value: number | undefined) {
        this.deleteChild("inputs:radius")
        if (value !== undefined) {
            new AttributeX(this, "inputs:radius", (node) => {
                node.setToken("typeName", "float")
                node.setFloat("default", value)
            })
        }
    }
    // treatAsPoint
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
