import { SpecType } from "../../crate/SpecType.ts"
import { UsdNode } from "../../crate/UsdNode.ts"
import type { Variability } from "../../crate/Variability.ts"

export class Attribute extends UsdNode {
    value: any
    variability?: Variability
    custom?: boolean

    constructor(parent: UsdNode, name: string, value: any) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Attribute
        this.value = value
        this.custom = false
    }

    override encodeFields(): void {
        super.encodeFields()
        this.setBoolean("custom", this.custom)
        switch (typeof this.value) {
            case "string":
                this.crate.fieldsets.fieldset_indices.push(
                    this.crate.fields.setToken("typeName", "string")
                )
                this.crate.fieldsets.fieldset_indices.push(
                    this.crate.fields.setString("default", this.value)
                )
                break
            case "boolean":
                this.crate.fieldsets.fieldset_indices.push(
                    this.crate.fields.setToken("typeName", "bool")
                )
                if (this.variability) {
                    this.crate.fieldsets.fieldset_indices.push(
                        this.crate.fields.setVariability("variability", this.variability)
                    )
                }
                this.crate.fieldsets.fieldset_indices.push(
                    this.crate.fields.setBoolean("default", this.value)
                )
                break
            default:
                throw Error("TBD")
        }

    }
}
