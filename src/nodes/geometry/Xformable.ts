import { Variability } from "../../crate/Variability.ts"
import { Attribute } from "../attributes/Attribute.ts"
import { AttributeX } from "../attributes/AttributeX.ts"
import { Imageable } from "./Imageable.ts"

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
