import { SpecType } from "../../crate/SpecType"
import { UsdNode } from "../usd/UsdNode"

export class FloatAttr extends UsdNode {
    value: number | ArrayLike<number>
    constructor(parent: UsdNode, name: string, value: number | ArrayLike<number>) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.value = value
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate
        if (Array.isArray(this.value)) {
            crate.fieldsets.fieldset_indices.push(
                crate.fields.setToken("typeName", "float[]")
            )
            if (this.value.length > 0) {
                crate.fieldsets.fieldset_indices.push(
                    crate.fields.setFloatArray("default", this.value)
                )
            }
        } else {
            crate.fieldsets.fieldset_indices.push(
                crate.fields.setToken("typeName", "float")
            )
            crate.fieldsets.fieldset_indices.push(
                crate.fields.setFloat("default", this.value as number)
            )
        }
    }
}
