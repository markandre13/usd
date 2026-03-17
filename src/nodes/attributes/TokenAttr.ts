import { SpecType } from "../../crate/SpecType"
import { UsdNode } from "../usd/UsdNode"
import type { Variability } from "../../crate/Variability"

export class TokenAttr extends UsdNode {
    variability?: Variability
    token?: string
    constructor(parent: UsdNode, name: string, variability?: Variability, token?: string) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.variability = variability
        this.token = token
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "token")
        )
        if (this.variability !== undefined) {
            crate.fieldsets.fieldset_indices.push(
                crate.fields.setVariability("variability", this.variability)
            )
        }
        if (this.token !== undefined) {
            crate.fieldsets.fieldset_indices.push(
                crate.fields.setToken("default", this.token)
            )
        }
    }
}
