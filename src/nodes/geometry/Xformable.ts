import { Variability } from "../../crate/Variability"
import { Attribute } from "../attributes/Attribute"
import { StringAttr } from "../attributes/StringAttr"
import { Imageable } from "./Imageable"

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
            new StringAttr(this, "userProperties:blender:object_name", value, {custom: true})
        }
    }
    set rotateXYZ(value: number[] | undefined) {
        this.deleteChild("xformOp:rotateXYZ")
        new Attribute(this, "xformOp:rotateXYZ", (node) => {
            node.setToken("typeName", "float3")
            node.setVec3f("default", value)
        })
    }
    set scale(value: number[] | undefined) {
        this.deleteChild("xformOp:scale")
        new Attribute(this, "xformOp:scale", (node) => {
            node.setToken("typeName", "float3")
            node.setVec3f("default", value)
        })
    }
    set translate(value: number[] | undefined) {
        this.deleteChild("xformOp:translate")
        new Attribute(this, "xformOp:translate", (node) => {
            node.setToken("typeName", "double3")
            node.setVec3d("default", value)
        })
    }
    set xformOrder(value: ("xformOp:translate" | "xformOp:rotateXYZ" | "xformOp:scale")[] | undefined) {
        new Attribute(this, "xformOpOrder", (node) => {
            node.setToken("typeName", "token[]")
            node.setVariability("variability", Variability.Uniform)
            node.setTokenArray("default", value)
        })
    }
}
