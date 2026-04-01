import { Specifier } from "../../crate/Specifier"
import { SpecType } from "../../crate/SpecType"
import type { UsdNode } from "../usd/UsdNode"
import { AssetPathAttr } from "../attributes/AssetPathAttr"
import { NonboundableLightBase } from "./NonboundableLightBase"
import { Attribute } from "../attributes/Attribute"
import { Variability } from "../../crate/Variability"

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

    // copied from Xformable
    set rotateXYZ(value: ArrayLike<number> | undefined) {
        this.deleteChild("xformOp:rotateXYZ")
        new Attribute(this, "xformOp:rotateXYZ", (node) => {
            node.setToken("typeName", "float3")
            node.setVec3f("default", value)
        })
    }
    set scale(value: ArrayLike<number> | undefined) {
        this.deleteChild("xformOp:scale")
        new Attribute(this, "xformOp:scale", (node) => {
            node.setToken("typeName", "float3")
            node.setVec3f("default", value)
        })
    }
    set translate(value: ArrayLike<number> | undefined) {
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
