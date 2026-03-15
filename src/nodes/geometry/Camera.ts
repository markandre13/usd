import { Specifier } from "../../crate/Specifier.ts"
import { SpecType } from "../../crate/SpecType.ts"
import type { UsdNode } from "../../crate/UsdNode.ts"
import { Attribute } from "../attributes/Attribute.ts"
import { AttributeX } from "../attributes/AttributeX.ts"
import { Boundable } from "./Boundable.ts"

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
