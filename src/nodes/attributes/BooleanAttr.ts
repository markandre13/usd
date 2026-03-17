import { SpecType } from "../../crate/SpecType"
import { UsdNode } from "../usd/UsdNode"
import type { Variability } from "../../crate/Variability"

export class BooleanAttr extends UsdNode {
    value: boolean
    custom?: boolean
    variability?: Variability

    constructor(parent: UsdNode, name: string, value: boolean, options?: { custom?: boolean; variability?: Variability} ) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.value = value
        this.custom = options?.custom
        this.variability = options?.variability
    }
    override encodeFields() {
        super.encodeFields()
        this.setBoolean("custom", this.custom)
        this.setToken("typeName", "bool")
        this.setVariability("variability", this.variability)
        this.setBoolean("default", this.value)
    }
}
