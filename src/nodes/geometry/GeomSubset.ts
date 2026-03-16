import { Specifier } from "../../crate/Specifier"
import { SpecType } from "../../crate/SpecType"
import { UsdNode } from "../../crate/UsdNode"

export class GeomSubset extends UsdNode {
    constructor(parent: UsdNode, name: string) {
        super(parent.crate, parent, -1, name, false)
        this.spec_type = SpecType.Prim
    }
    override encodeFields() {
        super.encodeFields()
        const crate = this.crate

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setSpecifier("specifier", Specifier.Def)
        )
        crate.fieldsets.fieldset_indices.push(
            crate.fields.setToken("typeName", "GeomSubset")
        )

        crate.fieldsets.fieldset_indices.push(
            crate.fields.setTokenListOp("apiSchemas", {
                prepend: ["MaterialBindingAPI"]
            })
        )
    }
}
