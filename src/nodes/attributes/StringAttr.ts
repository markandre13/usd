import { SpecType } from "../../crate/SpecType"
import { UsdNode } from "../../crate/UsdNode"

export class StringAttr extends UsdNode {
    value: string
    custom?: boolean
    constructor(parent: UsdNode, name: string, value: string, options?: { custom?: boolean} ) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.value = value
        this.custom = options?.custom
    }
    override encodeFields() {
        super.encodeFields()
        this.setBoolean("custom", this.custom)
        this.setToken("typeName", "string")
        this.setString("default", this.value)
    }
}
