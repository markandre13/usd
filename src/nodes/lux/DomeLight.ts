import { Specifier } from "../../crate/Specifier"
import { SpecType } from "../../crate/SpecType"
import type { UsdNode } from "../../crate/UsdNode"
import { AssetPathAttr } from "../attributes/AssetPathAttr"
import { NonboundableLightBase } from "./NonboundableLightBase"

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

}
