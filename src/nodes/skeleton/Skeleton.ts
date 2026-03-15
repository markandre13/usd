import { Specifier } from "../../crate/Specifier.ts"
import { SpecType } from "../../crate/SpecType.ts"
import type { UsdNode } from "../../crate/UsdNode.ts"
import { Variability } from "../../crate/Variability.ts"
import { AttributeX } from "../attributes/AttributeX.ts"
import { Boundable } from "../geometry/Boundable.ts"

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
