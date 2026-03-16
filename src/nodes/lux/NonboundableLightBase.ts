import { UsdNode } from "../../crate/UsdNode"
import { Attribute } from "../attributes/Attribute"

export class NonboundableLightBase extends UsdNode {
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
}
