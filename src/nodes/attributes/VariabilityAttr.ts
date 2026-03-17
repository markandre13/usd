import { SpecType } from "../../crate/SpecType"
import { UsdNode } from "../usd/UsdNode"
import type { Variability } from "../../crate/Variability"

export class VariabilityAttr extends UsdNode {
    variability: Variability
    value: string
    constructor(parent: UsdNode, name: string, variability: Variability, value: string) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.variability = variability
        this.value = value
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "token")
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setVariability("variability", this.variability)
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("default", this.value)
        )
    }
}
