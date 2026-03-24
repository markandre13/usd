import { SpecType } from "../../crate/SpecType"
import { UsdNode } from "../usd/UsdNode"
import type { Variability } from "../../crate/Variability"

export class TokenAttr extends UsdNode {
    variability?: Variability
    token?: string | string[]
    constructor(parent: UsdNode, name: string, variability?: Variability, token?: string | string[]) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.variability = variability
        this.token = token
    }

    override encodeFields() {
        super.encodeFields()
        const crate = this.crate
        if (Array.isArray(this.token)) {
            crate.fieldsets.fieldset_indices.push(
                crate.fields.setToken("typeName", "token[]")
            )
        } else {
            crate.fieldsets.fieldset_indices.push(
                crate.fields.setToken("typeName", "token")
            )
        }
        if (this.variability !== undefined) {
            crate.fieldsets.fieldset_indices.push(
                crate.fields.setVariability("variability", this.variability)
            )
        }
        if (this.token !== undefined) {
            if (Array.isArray(this.token)) {
                crate.fieldsets.fieldset_indices.push(
                    crate.fields.setTokenArray("default", this.token)
                )
            } else {
                crate.fieldsets.fieldset_indices.push(
                    crate.fields.setToken("default", this.token)
                )
            }
        }
    }
}
