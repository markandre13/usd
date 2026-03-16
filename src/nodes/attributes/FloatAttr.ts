import { SpecType } from "../../crate/SpecType"
import { UsdNode } from "../../crate/UsdNode"

export class FloatAttr extends UsdNode {
    value: number
    constructor(parent: UsdNode, name: string, value: number) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.value = value
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "float")
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setFloat("default", this.value)
        )
    }
}
