import { Attribute } from "../attributes/Attribute"
import { StringAttr } from "../attributes/StringAttr"
import { Boundable } from "../geometry/Boundable"

/**
 * Base class for intrinsic lights that are boundable.
 *
 * The primary purpose of this class is to provide a direct API to the
 * functions provided by LightAPI for concrete derived light types.
 *
 * defined in pxr/usd/usdLux/schema.usda
 */
export class BoundableLightBase extends Boundable {
    set enableColorTemperature(value: boolean | undefined) {
        this.deleteChild("inputs:enableColorTemperature")
        if (value !== undefined) {
            new Attribute(this, "inputs:enableColorTemperature", (node) => {
                node.setToken("typeName", "bool")
                node.setBoolean("default", value)
            })
        }
    }
    set normalize(value: boolean | undefined) {
        this.deleteChild("inputs:normalize")
        if (value !== undefined) {
            new Attribute(this, "inputs:normalize", (node) => {
                node.setToken("typeName", "bool")
                node.setBoolean("default", value)
            })
        }
    }
    set intensity(value: number | undefined) {
        this.deleteChild("inputs:intensity")
        if (value !== undefined) {
            new Attribute(this, "inputs:intensity", (node) => {
                node.setToken("typeName", "float")
                node.setFloat("default", value)
            })
        }
    }
    set blenderDataName(value: string | undefined) {
        this.deleteChild("userProperties:blender:data_name")
        if (value !== undefined) {
            new StringAttr(this, "userProperties:blender:data_name", value, {custom: true})
        }
    }
}
