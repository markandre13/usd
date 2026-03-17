import { SpecType } from "../../crate/SpecType"
import { UsdNode } from "../usd/UsdNode.js"

export class AssetPathAttr extends UsdNode {
    value: string
    constructor(parent: UsdNode, name: string, value: string) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.value = value
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "asset")
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setAssetPath("default", this.value)
        )
    }
}
