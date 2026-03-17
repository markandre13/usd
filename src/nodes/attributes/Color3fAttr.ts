import { SpecType } from "../../crate/SpecType"
import { UsdNode } from "../usd/UsdNode"

export class Color3fAttr extends UsdNode {
    value: ArrayLike<number>
    constructor(parent: UsdNode, name: string, value: ArrayLike<number>) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.value = value
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "color3f")
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setVec3f("default", this.value)
        )
    }
}
