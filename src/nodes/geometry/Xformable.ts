import { CrateDataType } from "../../crate/CrateDataType.js"
import { Variability } from "../../crate/Variability.js"
import { TimeSamples } from "../../types/TimeSamples.js"
import { Attribute } from "../attributes/Attribute.js"
import { StringAttr } from "../attributes/StringAttr.js"
import { UsdNode } from "../usd/UsdNode.js"
import { Imageable } from "./Imageable.js"

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
        Xformable._blenderObjectName(this, value)
    }
    static _blenderObjectName(node: UsdNode, value: string | undefined) {
        node.deleteChild("userProperties:blender:object_name")
        if (value !== undefined) {
            new StringAttr(node, "userProperties:blender:object_name", value, { custom: true })
        }
    }
    set rotateXYZ(value: ArrayLike<number> | TimeSamples | undefined) {
        this.deleteChild("xformOp:rotateXYZ")
        if (value !== undefined) {
            new Attribute(this, "xformOp:rotateXYZ", (node) => {
                if (Array.isArray(value)) {
                    node.setToken("typeName", "float3")
                    node.setVec3f("default", value)
                } else {
                    node.setToken("typeName", "float3")
                    const ts = value as TimeSamples
                    node.setTimeSamples("timeSamples", {
                        ...ts,
                        sampleType: CrateDataType.Vec3f
                    })
                }
            })
        }
    }
    set scale(value: ArrayLike<number> | TimeSamples | undefined) {
        this.deleteChild("xformOp:scale")
        new Attribute(this, "xformOp:scale", (node) => {
            if (Array.isArray(value)) {
                node.setToken("typeName", "float3")
                node.setVec3f("default", value)
            } else {
                node.setToken("typeName", "float3")
                const ts = value as TimeSamples
                node.setTimeSamples("timeSamples", {
                    ...ts,
                    sampleType: CrateDataType.Vec3f
                })
            }
        })
    }
    set translate(value: ArrayLike<number> | TimeSamples | undefined) {
        this.deleteChild("xformOp:translate")
        new Attribute(this, "xformOp:translate", (node) => {
            if (Array.isArray(value)) {
                node.setToken("typeName", "double3")
                node.setVec3d("default", value)
            } else {
                node.setToken("typeName", "double3")
                const ts = value as TimeSamples
                node.setTimeSamples("timeSamples", {
                    ...ts,
                    sampleType: CrateDataType.Vec3d
                })
            }
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
