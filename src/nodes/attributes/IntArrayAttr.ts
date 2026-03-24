import { SpecType } from "../../crate/SpecType"
import { Variability } from "../../crate/Variability"
import { UsdNode } from "../usd/UsdNode"

export class IntArrayAttr extends UsdNode {
    value: ArrayLike<number>
    variability?: Variability
    constructor(parent: UsdNode, name: string, value: ArrayLike<number>, variability?: Variability) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.value = value
        this.variability = variability
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "int[]")
        )
        if (this.variability !== undefined) {
            crate.fieldsets.fieldset_indices.push(
                crate.fields.setVariability("variability", this.variability)
            )
        }
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setIntArray("default", this.value)
        )
    }
}
