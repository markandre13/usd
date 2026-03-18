import { Specifier } from "../../crate/Specifier"
import { SpecType } from "../../crate/SpecType"
import type { UsdNode } from "../usd/UsdNode"
import { Variability } from "../../crate/Variability"
import { Attribute } from "../attributes/Attribute"
import { Boundable } from "../geometry/Boundable"

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
     * 
     * e.g. a skeleton of
     * 
     * root -> spine05 -> spinge04
     * 
     * will have it's joints listed as
     * 
     * ["root", "root/spine05", "root/spine05/spine04"]
     */
    set joints(value: string[] | undefined) {
        this.deleteChild("joints")
        if (value !== undefined) {
            new Attribute(this, "joints", (node) => {
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
            new Attribute(this, "jointNames", (node) => {
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
    set bindTransforms(value: ArrayLike<number> | undefined) {
        this.deleteChild("bindTransforms")
        if (value !== undefined) {
            new Attribute(this, "bindTransforms", (node) => {
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
    set restTransforms(value: ArrayLike<number> | undefined) {
        this.deleteChild("restTransforms")
        if (value !== undefined) {
            new Attribute(this, "restTransforms", (node) => {
                node.setToken("typeName", "matrix4d[]")
                node.setVariability("variability", Variability.Uniform)
                node.setMatrix4dArray("default", value)
            })
        }
    }

    /**
     * Useful when exporting to Blender to indicate the length of leaf bones.
     */
    set blenderBoneLength(value: ArrayLike<number> | undefined) {
        this.deleteChild("primvars:blender:bone_lengths")
        new Attribute(this, "primvars:blender:bone_lengths", (node) => {
            node.setToken("typeName", "float[]")
            node.setToken("interpolation", "uniform")
            node.setFloatArray("default", value)
        })
    }
}
